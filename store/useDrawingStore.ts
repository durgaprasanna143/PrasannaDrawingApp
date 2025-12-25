import { create } from 'zustand';

export type Tool = 'brush' | 'eraser' | 'lasso' | 'move' | 'bucket';

export interface Point {
    x: number;
    y: number;
    pressure: number;
}

export interface DrawingPath {
    id: string;
    points: Point[];
    color: string;
    strokeWidth: number;
    opacity: number;
    tool: Tool;
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    paths: DrawingPath[];
    opacity: number;
}

export interface Frame {
    id: string;
    layers: Layer[];
}

interface DrawingState {
    // Project State
    frames: Frame[];
    currentFrameIndex: number;
    currentLayerId: string | null;

    // Tool State
    selectedTool: Tool;
    brushColor: string;
    brushSize: number;
    brushOpacity: number;

    // Canvas State
    canvasWidth: number;
    canvasHeight: number;
    scale: number;
    offset: { x: number, y: number };

    // History State
    undoStack: { frames: Frame[], currentFrameIndex: number, currentLayerId: string | null }[];
    redoStack: { frames: Frame[], currentFrameIndex: number, currentLayerId: string | null }[];

    // Playback State
    isPlaying: boolean;

    // Selection State
    selectionPoints: Point[] | null;
    selectedPathIds: string[];

    // Actions
    setTool: (tool: Tool) => void;
    togglePlayback: () => void;
    setBrushColor: (color: string) => void;
    setBrushSize: (size: number) => void;
    addPath: (path: DrawingPath) => void;
    addFrame: () => void;
    setCurrentFrame: (index: number) => void;
    selectLayer: (id: string) => void;
    addLayer: () => void;
    clearCanvas: () => void;
    undo: () => void;
    redo: () => void;
    pushToUndoStack: () => void;

    // Selection Actions
    setSelectionPoints: (points: Point[] | null) => void;
    setSelectedPathIds: (ids: string[]) => void;
    moveSelectedPaths: (dx: number, dy: number) => void;
    clearSelection: () => void;
    setCanvasTransform: (scale?: number, offset?: { x: number, y: number }) => void;
    fillCanvas: () => void;
}

const createInitialLayer = (id: string, name: string): Layer => ({
    id,
    name,
    visible: true,
    locked: false,
    paths: [],
    opacity: 1,
});

const createInitialFrame = (id: string): Frame => ({
    id,
    layers: [createInitialLayer('layer-1', 'Layer 1')],
});

export const useDrawingStore = create<DrawingState>((set) => ({
    frames: [createInitialFrame('frame-1')],
    currentFrameIndex: 0,
    currentLayerId: 'layer-1',

    selectedTool: 'brush',
    brushColor: '#000000',
    brushSize: 5,
    brushOpacity: 1,

    canvasWidth: 1000,
    canvasHeight: 1000,
    scale: 1,
    offset: { x: 0, y: 0 },

    undoStack: [],
    redoStack: [],

    isPlaying: false,

    selectionPoints: null,
    selectedPathIds: [],

    setTool: (tool) => set({ selectedTool: tool }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setBrushColor: (color) => set({ brushColor: color }),
    setBrushSize: (size) => set({ brushSize: size }),

    addPath: (path) => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];
        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;

            return {
                ...frame,
                layers: frame.layers.map((layer) => {
                    if (layer.id !== state.currentLayerId) return layer;

                    return {
                        ...layer,
                        paths: [...layer.paths, path],
                    };
                }),
            };
        });

        return {
            frames: newFrames,
            undoStack,
            redoStack: [],
        };
    }),

    undo: () => set((state) => {
        if (state.undoStack.length === 0) return state;

        const previousState = state.undoStack[state.undoStack.length - 1];
        const newUndoStack = state.undoStack.slice(0, -1);

        return {
            frames: previousState.frames,
            currentFrameIndex: previousState.currentFrameIndex,
            currentLayerId: previousState.currentLayerId,
            undoStack: newUndoStack,
            redoStack: [{
                frames: state.frames,
                currentFrameIndex: state.currentFrameIndex,
                currentLayerId: state.currentLayerId
            }, ...state.redoStack]
        };
    }),

    redo: () => set((state) => {
        if (state.redoStack.length === 0) return state;

        const nextState = state.redoStack[0];
        const newRedoStack = state.redoStack.slice(1);

        return {
            frames: nextState.frames,
            currentFrameIndex: nextState.currentFrameIndex,
            currentLayerId: nextState.currentLayerId,
            undoStack: [...state.undoStack, {
                frames: state.frames,
                currentFrameIndex: state.currentFrameIndex,
                currentLayerId: state.currentLayerId
            }],
            redoStack: newRedoStack
        };
    }),

    addFrame: () => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];
        const newId = `frame-${state.frames.length + 1}`;
        const prevFrame = state.frames[state.currentFrameIndex];
        const newFrame: Frame = {
            id: newId,
            layers: prevFrame.layers.map(l => ({ ...l, paths: [] }))
        };
        return {
            frames: [...state.frames, newFrame],
            currentFrameIndex: state.frames.length,
            undoStack,
            redoStack: []
        };
    }),

    setCurrentFrame: (index) => set({ currentFrameIndex: index }),

    selectLayer: (id) => set({ currentLayerId: id }),

    addLayer: () => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];
        const newFrames = state.frames.map(frame => {
            const newLayerId = `layer-${frame.layers.length + 1}`;
            return {
                ...frame,
                layers: [...frame.layers, createInitialLayer(newLayerId, `Layer ${frame.layers.length + 1}`)]
            };
        });
        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    }),

    clearCanvas: () => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];
        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;
            return {
                ...frame,
                layers: frame.layers.map(layer => {
                    if (layer.id !== state.currentLayerId) return layer;
                    return { ...layer, paths: [] };
                })
            };
        });
        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    }),

    pushToUndoStack: () => set((state) => ({
        undoStack: [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }],
        redoStack: []
    })),

    // Selection Actions
    setSelectionPoints: (points) => set({ selectionPoints: points }),

    setSelectedPathIds: (ids) => set({ selectedPathIds: ids }),

    moveSelectedPaths: (dx, dy) => set((state) => {
        // moveSelectedPaths is usually called on every mouse move, 
        // so we DON'T want to push to undo stack here. 
        // It's already handled in DrawingCanvas by calling pushToUndoStack in onStart.
        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;

            return {
                ...frame,
                layers: frame.layers.map((layer) => {
                    return {
                        ...layer,
                        paths: layer.paths.map((path) => {
                            if (!state.selectedPathIds.includes(path.id)) return path;

                            return {
                                ...path,
                                points: path.points.map((p) => ({
                                    ...p,
                                    x: p.x + dx,
                                    y: p.y + dy,
                                })),
                            };
                        }),
                    };
                }),
            };
        });

        return { frames: newFrames };
    }),

    clearSelection: () => set({ selectionPoints: null, selectedPathIds: [] }),

    setCanvasTransform: (scale, offset) => set((state) => ({
        scale: scale ?? state.scale,
        offset: offset ?? state.offset
    })),
    fillCanvas: () => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];
        const fillPath: DrawingPath = {
            id: Math.random().toString(36).substr(2, 9),
            points: [
                { x: 0, y: 0, pressure: 1 },
                { x: state.canvasWidth, y: 0, pressure: 1 },
                { x: state.canvasWidth, y: state.canvasHeight, pressure: 1 },
                { x: 0, y: state.canvasHeight, pressure: 1 },
                { x: 0, y: 0, pressure: 1 } // Close the path
            ],
            color: state.brushColor,
            strokeWidth: 0,
            opacity: 1,
            tool: 'bucket',
        };

        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;
            return {
                ...frame,
                layers: frame.layers.map((layer) => {
                    if (layer.id !== state.currentLayerId) return layer;
                    return {
                        ...layer,
                        paths: [...layer.paths, fillPath],
                    };
                }),
            };
        });

        return {
            frames: newFrames,
            undoStack,
            redoStack: [],
        };
    }),
}));
