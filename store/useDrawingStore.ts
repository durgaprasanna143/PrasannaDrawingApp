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
    keyframe?: boolean;
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
    recentColors: string[];

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
    addRecentColor: (color: string) => void;
    toggleLayerVisibility: (layerId: string) => void;
    deleteLayer: (layerId: string) => void;
    duplicateLayer: (layerId: string) => void;
    toggleLayerLock: (layerId: string) => void;
    deleteFrame: (index: number) => void;
    duplicateFrame: (index: number) => void;
    extendFrame: (index: number, count?: number) => void;
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
    keyframe: true,
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
    recentColors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],

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

        // Find the range of frames to update (Source Keyframe -> End of Extensions)
        let startIndex = state.currentFrameIndex;
        // Search backwards for the source keyframe
        while (startIndex > 0 && state.frames[startIndex].keyframe === false) {
            startIndex--;
        }

        // Search forwards for determining the end of this sequence
        let endIndex = startIndex;
        while (endIndex < state.frames.length - 1 && state.frames[endIndex + 1].keyframe === false) {
            endIndex++;
        }

        const newFrames = state.frames.map((frame, fIndex) => {
            // Only update frames in the identified range
            if (fIndex < startIndex || fIndex > endIndex) return frame;

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
            layers: prevFrame.layers.map(l => ({ ...l, paths: [] })),
            keyframe: true,
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
    addRecentColor: (color) => set((state) => {
        if (state.recentColors.includes(color)) return state;
        const newRecent = [color, ...state.recentColors].slice(0, 10);
        return { recentColors: newRecent };
    }),

    toggleLayerVisibility: (layerId) => set((state) => {
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
                    if (layer.id !== layerId) return layer;
                    return { ...layer, visible: !layer.visible };
                }),
            };
        });

        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    }),
    deleteLayer: (layerId) => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];

        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;
            const newLayers = frame.layers.filter(l => l.id !== layerId);
            // Ensure at least one layer exists
            if (newLayers.length === 0) {
                return {
                    ...frame,
                    layers: [createInitialLayer(`layer-${Math.random()}`, 'Layer 1')],
                    keyframe: true
                };
            }
            return { ...frame, layers: newLayers, keyframe: true };
        });

        // If we deleted the current layer, select the first available one
        let newCurrentLayerId = state.currentLayerId;
        const currentFrame = newFrames[state.currentFrameIndex];
        if (!currentFrame.layers.find(l => l.id === state.currentLayerId)) {
            newCurrentLayerId = currentFrame.layers[0].id;
        }

        return {
            frames: newFrames,
            currentLayerId: newCurrentLayerId,
            undoStack,
            redoStack: []
        };
    }),

    duplicateLayer: (layerId) => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];

        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;
            const layerIndex = frame.layers.findIndex(l => l.id === layerId);
            if (layerIndex === -1) return frame;

            const originalLayer = frame.layers[layerIndex];
            const newLayer: Layer = {
                ...JSON.parse(JSON.stringify(originalLayer)),
                id: `layer-${Math.random().toString(36).substr(2, 9)}`,
                name: `${originalLayer.name} Copy`
            };

            const newLayers = [...frame.layers];
            newLayers.splice(layerIndex + 1, 0, newLayer);

            return { ...frame, layers: newLayers };
        });

        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    }),

    toggleLayerLock: (layerId) => set((state) => {
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
                    if (layer.id !== layerId) return layer;
                    return { ...layer, locked: !layer.locked };
                }),
            };
        });

        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    }),

    deleteSelectedPaths: () => set((state) => {
        if (state.selectedPathIds.length === 0) return state;

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
                        paths: layer.paths.filter(p => !state.selectedPathIds.includes(p.id))
                    };
                }),
            };
        });

        return {
            frames: newFrames,
            selectedPathIds: [],
            selectionPoints: null,
            undoStack,
            redoStack: []
        };
    }),

    duplicateSelectedPaths: () => set((state) => {
        if (state.selectedPathIds.length === 0) return state;

        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];

        let newSelectedIds: string[] = [];

        const newFrames = state.frames.map((frame, fIndex) => {
            if (fIndex !== state.currentFrameIndex) return frame;
            return {
                ...frame,
                layers: frame.layers.map((layer) => {
                    if (layer.id !== state.currentLayerId) return layer;

                    const newPaths: DrawingPath[] = [];
                    layer.paths.forEach(p => {
                        if (state.selectedPathIds.includes(p.id)) {
                            const newId = Math.random().toString(36).substr(2, 9);
                            newSelectedIds.push(newId);
                            newPaths.push({
                                ...p,
                                id: newId,
                                points: p.points.map(pt => ({ ...pt, x: pt.x + 20, y: pt.y + 20 })) // Offset slightly
                            });
                        }
                    });

                    return {
                        ...layer,
                        paths: [...layer.paths, ...newPaths]
                    };
                }),
            };
        });

        return {
            frames: newFrames,
            selectedPathIds: newSelectedIds,
            undoStack,
            redoStack: []
        };
    }),

    // Frame Management
    deleteFrame: (index: number) => set((state) => {
        if (state.frames.length <= 1) return state; // Don't delete the last frame

        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];

        const newFrames = [...state.frames];
        newFrames.splice(index, 1);

        // Adjust currentFrameIndex if needed
        let newIndex = state.currentFrameIndex;
        if (index <= state.currentFrameIndex) {
            newIndex = Math.max(0, state.currentFrameIndex - 1);
        }

        return {
            frames: newFrames,
            currentFrameIndex: newIndex,
            undoStack,
            redoStack: []
        };
    }),

    duplicateFrame: (index: number) => set((state) => {
        const undoStack = [...state.undoStack, {
            frames: JSON.parse(JSON.stringify(state.frames)),
            currentFrameIndex: state.currentFrameIndex,
            currentLayerId: state.currentLayerId
        }];

        const frameToCopy = state.frames[index];
        const newFrame = JSON.parse(JSON.stringify(frameToCopy));
        newFrame.id = `frame-${Math.random().toString(36).substr(2, 9)}`;

        // Ensure copied frame is treated as a new keyframe initially
        newFrame.keyframe = true;

        const newFrames = [...state.frames];
        newFrames.splice(index + 1, 0, newFrame);

        return {
            frames: newFrames,
            currentFrameIndex: index + 1, // Jump to new duplicate
            undoStack,
            redoStack: []
        };
    }),

    extendFrame: (index: number, count: number = 1, suppressHistory: boolean = false) => set((state) => {
        let undoStack = state.undoStack;

        if (!suppressHistory) {
            undoStack = [...state.undoStack, {
                frames: JSON.parse(JSON.stringify(state.frames)),
                currentFrameIndex: state.currentFrameIndex,
                currentLayerId: state.currentLayerId
            }];
        }

        const newFrames = [...state.frames];

        if (count > 0) {
            // EXTEND: Add hold frames after the keyframe
            const frameToCopy = state.frames[index];
            const newFramesToAdd = Array.from({ length: count }).map(() => {
                const newFrame = JSON.parse(JSON.stringify(frameToCopy));
                newFrame.id = `frame-${Math.random().toString(36).substr(2, 9)}`;
                // Keep same layer IDs to maintain track continuity
                newFrame.keyframe = false; // Mark as "hold" frame (not a keyframe)
                return newFrame;
            });
            newFrames.splice(index + 1, 0, ...newFramesToAdd);
        } else if (count < 0) {
            // SHRINK: Remove hold frames after the keyframe
            const framesToRemove = Math.abs(count);
            let removed = 0;

            // Start from the frame after the keyframe and remove hold frames
            for (let i = index + 1; i < newFrames.length && removed < framesToRemove; i++) {
                // Only remove if it's a hold frame (not a keyframe)
                if (newFrames[i].keyframe === false) {
                    newFrames.splice(i, 1);
                    removed++;
                    i--; // Adjust index since we removed an element
                } else {
                    // Stop if we hit another keyframe
                    break;
                }
            }
        }

        return {
            frames: newFrames,
            undoStack,
            redoStack: []
        };
    })
}));
