import { Colors } from '@/constants/theme';
import { DrawingPath, Point, useDrawingStore } from '@/store/useDrawingStore';
import {
    Canvas,
    DashPathEffect,
    Group,
    Path,
    Rect,
    Skia
} from '@shopify/react-native-skia';
import React, { useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const isPointInPolygon = (point: Point, polygon: Point[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

const createSkiaPath = (points: Point[], isClosed: boolean = false) => {
    const path = Skia?.Path?.Make();
    if (!path || points.length === 0) return path;
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i].x, points[i].y);
    }
    if (isClosed) {
        path.close();
    }
    return path;
};

export const DrawingCanvas = () => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const {
        frames,
        currentFrameIndex,
        selectedTool,
        brushColor,
        brushSize,
        addPath,
        selectionPoints,
        selectedPathIds,
        setSelectionPoints,
        setSelectedPathIds,
        moveSelectedPaths,
        clearSelection,
        pushToUndoStack,
        undo,
        redo,
        scale,
        offset,
        setCanvasTransform,
        canvasWidth,
        canvasHeight,
        fillCanvas,
    } = useDrawingStore();

    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const activePointsRef = React.useRef<Point[]>([]);
    const lastPosRef = React.useRef<{ x: number, y: number } | null>(null);
    const baseFocalRef = React.useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Refs for zoom/pan to avoid state-stale closures in worklets if needed, 
    // but runOnJS(true) is used here for simplicity.
    const baseScaleRef = React.useRef(scale);
    const baseOffsetRef = React.useRef(offset);

    const getLiveCanvasPos = (x: number, y: number) => {
        const state = useDrawingStore.getState();
        return {
            x: (x - state.offset.x) / state.scale,
            y: (y - state.offset.y) / state.scale,
        };
    };

    const undoGesture = Gesture.Tap()
        .numberOfTaps(1)
        .minPointers(2)
        .onEnd(() => {
            undo();
        })
        .runOnJS(true);

    const redoGesture = Gesture.Tap()
        .numberOfTaps(1)
        .minPointers(3)
        .onEnd(() => {
            redo();
        })
        .runOnJS(true);

    const zoomGesture = Gesture.Pinch()
        .onStart((event) => {
            const state = useDrawingStore.getState();
            baseScaleRef.current = state.scale;
            baseOffsetRef.current = state.offset;

            // Capture the initial focal point in canvas space
            baseFocalRef.current = {
                x: (event.focalX - state.offset.x) / state.scale,
                y: (event.focalY - state.offset.y) / state.scale,
            };
        })
        .onUpdate((event) => {
            const newScale = baseScaleRef.current * event.scale;
            const clampedScale = Math.min(Math.max(newScale, 0.1), 10);

            // Current focal point (fingers might have moved)
            const focalX = event.focalX;
            const focalY = event.focalY;

            // To pin baseFocalRef.current to the current screen focal point:
            // focalX = baseFocal.x * clampedScale + newOffsetX
            const newOffsetX = focalX - baseFocalRef.current.x * clampedScale;
            const newOffsetY = focalY - baseFocalRef.current.y * clampedScale;

            setCanvasTransform(clampedScale, { x: newOffsetX, y: newOffsetY });
        })
        .runOnJS(true);

    const panCanvasGesture = Gesture.Pan()
        .minPointers(2)
        .maxPointers(2)
        .onStart(() => {
            const state = useDrawingStore.getState();
            baseOffsetRef.current = state.offset;
        })
        .onUpdate((event) => {
            const newOffset = {
                x: baseOffsetRef.current.x + event.translationX,
                y: baseOffsetRef.current.y + event.translationY,
            };
            setCanvasTransform(undefined, newOffset);
        })
        .runOnJS(true);


    const panGesture = Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(0)
        .onStart((event) => {
            const state = useDrawingStore.getState();
            const pos = getLiveCanvasPos(event.x, event.y);
            if (state.selectedTool === 'brush' || state.selectedTool === 'eraser' || state.selectedTool === 'lasso') {
                const newPoint = { x: pos.x, y: pos.y, pressure: 1 };
                activePointsRef.current = [newPoint];
                setCurrentPoints([newPoint]);
                if (state.selectedTool === 'lasso') {
                    clearSelection();
                }
            } else if (state.selectedTool === 'move') {
                pushToUndoStack();
                lastPosRef.current = { x: pos.x, y: pos.y };
            } else if (state.selectedTool === 'bucket') {
                fillCanvas();
            }
        })
        .onUpdate((event) => {
            const state = useDrawingStore.getState();
            const pos = getLiveCanvasPos(event.x, event.y);
            if (state.selectedTool === 'brush' || state.selectedTool === 'eraser' || state.selectedTool === 'lasso') {
                const newPoint = { x: pos.x, y: pos.y, pressure: 1 };
                activePointsRef.current.push(newPoint);
                setCurrentPoints([...activePointsRef.current]);
            } else if (state.selectedTool === 'move' && lastPosRef.current) {
                const dx = pos.x - lastPosRef.current.x;
                const dy = pos.y - lastPosRef.current.y;
                moveSelectedPaths(dx, dy);
                lastPosRef.current = { x: pos.x, y: pos.y };
            }
        })
        .onEnd(() => {
            const state = useDrawingStore.getState();
            if (state.selectedTool === 'brush' || state.selectedTool === 'eraser') {
                if (activePointsRef.current.length < 2) {
                    activePointsRef.current = [];
                    setCurrentPoints([]);
                    return;
                }

                const newPath: DrawingPath = {
                    id: Math.random().toString(36).substr(2, 9),
                    points: [...activePointsRef.current],
                    color: state.selectedTool === 'eraser' ? 'transparent' : state.brushColor,
                    strokeWidth: state.brushSize,
                    opacity: 1,
                    tool: state.selectedTool,
                };

                addPath(newPath);
            } else if (state.selectedTool === 'lasso') {
                if (activePointsRef.current.length > 2) {
                    setSelectionPoints([...activePointsRef.current]);

                    // Find paths inside lasso
                    const currentFrame = state.frames[state.currentFrameIndex];
                    const currentLayer = currentFrame.layers.find(l => l.id === state.currentLayerId);
                    if (currentLayer) {
                        const insideIds = currentLayer.paths
                            .filter(path => path.points.some(p => isPointInPolygon(p, activePointsRef.current)))
                            .map(path => path.id);
                        setSelectedPathIds(insideIds);
                    }
                }
            } else if (state.selectedTool === 'move') {
                lastPosRef.current = null;
            }

            activePointsRef.current = [];
            setCurrentPoints([]);
        })
        .runOnJS(true);

    const composedGesture = Gesture.Simultaneous(
        Gesture.Exclusive(redoGesture, undoGesture),
        Gesture.Simultaneous(zoomGesture, panCanvasGesture),
        panGesture
    );

    const renderPath = React.useCallback((pathData: DrawingPath) => {
        if (pathData.points.length < 2) return null;

        const path = createSkiaPath(
            pathData.points,
            pathData.tool === 'bucket' || pathData.tool === 'lasso'
        );
        const isSelected = selectedPathIds.includes(pathData.id);

        return (
            <React.Fragment key={pathData.id}>
                <Path
                    path={path}
                    color={pathData.color}
                    style={pathData.tool === 'bucket' ? 'fill' : 'stroke'}
                    strokeWidth={pathData.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    blendMode={pathData.tool === 'eraser' ? 'clear' : 'srcOver'}
                />
                {isSelected && (
                    <Path
                        path={path}
                        color="rgba(0, 122, 255, 0.3)"
                        style="stroke"
                        strokeWidth={pathData.strokeWidth + 4}
                        strokeCap="round"
                        strokeJoin="round"
                    />
                )}
            </React.Fragment>
        );
    }, [selectedPathIds]);

    const currentFrame = frames[currentFrameIndex];
    const prevFrame = currentFrameIndex > 0 ? frames[currentFrameIndex - 1] : null;

    const onionSkin = React.useMemo(() => {
        if (!prevFrame) return null;
        return prevFrame.layers.map(layer =>
            layer.visible && layer.paths.map(path => (
                <Path
                    key={`onion-${path.id}`}
                    path={createSkiaPath(path.points, path.tool === 'bucket')}
                    color="rgba(255, 0, 0, 0.2)"
                    style={path.tool === 'bucket' ? 'fill' : 'stroke'}
                    strokeWidth={path.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                />
            ))
        );
    }, [prevFrame]);

    const committedPaths = React.useMemo(() => {
        return currentFrame.layers.map((layer) => (
            layer.visible && (
                <React.Fragment key={layer.id}>
                    {layer.paths.map(renderPath)}
                </React.Fragment>
            )
        ));
    }, [currentFrame, renderPath]);

    const activePath = React.useMemo(() => {
        if (currentPoints.length < 2) return null;
        return createSkiaPath(
            currentPoints,
            selectedTool === 'lasso' || selectedTool === 'bucket'
        );
    }, [currentPoints, selectedTool]);

    const matrix = React.useMemo(() => {
        if (!Skia) return undefined;
        const m = Skia.Matrix();
        // Transformation: Screen = Translation * Scale * P_canvas
        m.translate(offset.x, offset.y);
        m.scale(scale, scale);
        return m;
    }, [scale, offset]);

    if (!Skia) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8 }}>
                    {/* Fallback for Skia not loading (common on Web or setup issues) */}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.canvasBackground }]}>
            <GestureDetector gesture={composedGesture}>
                <Canvas style={styles.canvas}>
                    <Group matrix={matrix}>
                        {/* Paper background */}
                        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color={theme.paper} />

                        {/* Static Content */}
                        {onionSkin}
                        {committedPaths}

                        {/* Current Active Stroke (Brush/Eraser/Lasso boundary) */}
                        {activePath && (
                            <Path
                                path={activePath}
                                color={selectedTool === 'lasso' ? '#007AFF' : brushColor}
                                style={selectedTool === 'bucket' ? 'fill' : 'stroke'}
                                strokeWidth={selectedTool === 'lasso' ? 1 : brushSize}
                                strokeCap="round"
                                strokeJoin="round"
                                blendMode={selectedTool === 'eraser' ? 'clear' : 'srcOver'}
                                opacity={selectedTool === 'eraser' ? 1 : 0.8}
                            >
                                {selectedTool === 'lasso' && <DashPathEffect intervals={[5, 5]} />}
                            </Path>
                        )}

                        {/* Persistent Lasso Selection */}
                        {selectionPoints && (
                            <Path
                                path={createSkiaPath(selectionPoints)}
                                color="#007AFF"
                                style="stroke"
                                strokeWidth={1}
                                strokeCap="round"
                                strokeJoin="round"
                            >
                                <DashPathEffect intervals={[5, 5]} />
                            </Path>
                        )}
                    </Group>
                </Canvas>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    canvas: {
        flex: 1,
    },
});

