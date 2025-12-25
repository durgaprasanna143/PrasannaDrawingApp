import { Colors } from '@/constants/theme';
import { useDrawingStore } from '@/store/useDrawingStore';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { ArrowRight, Copy, GripVertical, Pause, Play, Plus, SkipBack, SkipForward, Trash2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// Define the FrameCell component with a proper name for React DevTools
function FrameCellComponent({
    frame,
    index,
    isActive,
    theme,
    frameWidth,
    keyframeNumber,
    onPress,
    onDragStart,
    onDragUpdate
}: {
    frame: any,
    index: number,
    isActive: boolean,
    theme: any,
    frameWidth: number,
    keyframeNumber: number,
    onPress: (index: number) => void,
    onDragStart: (index: number) => void,
    onDragUpdate: (index: number, tx: number) => void
}) {
    // Helper function to render paths for thumbnail
    const renderThumbnail = () => {
        if (!frame.layers || frame.layers.length === 0) return null;

        // Calculate scale to fit the drawing in the thumbnail
        const thumbnailSize = frameWidth - 4; // Account for padding
        const canvasSize = 1000; // Assuming your canvas is 1000x1000
        const scale = thumbnailSize / canvasSize;

        return (
            <Canvas style={{ width: thumbnailSize, height: 36, borderRadius: 2 }}>
                {frame.layers.map((layer: any, layerIndex: number) => {
                    if (!layer.visible) return null;
                    return layer.paths.map((drawingPath: any, pathIndex: number) => {
                        const path = Skia.Path.Make();

                        if (drawingPath.points && drawingPath.points.length > 0) {
                            // Scale down the points for thumbnail
                            const scaledPoints = drawingPath.points.map((p: any) => ({
                                x: p.x * scale,
                                y: p.y * scale
                            }));

                            path.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                            for (let i = 1; i < scaledPoints.length; i++) {
                                path.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                            }

                            // Close path for fill tools
                            if (drawingPath.tool === 'bucket' || drawingPath.tool === 'fill') {
                                path.close();
                            }
                        }

                        return (
                            <Path
                                key={`${layerIndex}-${drawingPath.id || pathIndex}`}
                                path={path}
                                color={drawingPath.color}
                                style={drawingPath.tool === 'bucket' || drawingPath.tool === 'fill' ? 'fill' : 'stroke'}
                                strokeWidth={drawingPath.tool === 'bucket' || drawingPath.tool === 'fill' ? 0 : (drawingPath.strokeWidth || 2) * scale}
                                opacity={layer.opacity}
                            />
                        );
                    });
                })}
            </Canvas>
        );
    };

    return (
        <TouchableOpacity
            style={[
                styles.frameCell,
                {
                    width: frameWidth,
                    borderColor: theme.border,
                    backgroundColor: isActive ? (theme.tint + '30') : theme.paper
                },
                isActive && { borderColor: theme.tint, borderWidth: 1 }
            ]}
            onPress={() => onPress(index)}
        >
            {/* Keyframe Number - Only show on actual keyframes */}
            {frame.keyframe !== false && (
                <Text style={[styles.frameNumber, { color: theme.text }]}>
                    {keyframeNumber}
                </Text>
            )}

            {/* Thumbnail Preview - Show on all frames (keyframes and hold frames) */}
            <View style={styles.thumbnailContainer}>
                {renderThumbnail()}
            </View>

            <View style={styles.resizeHandleContainer}>
                <GestureDetector gesture={
                    Gesture.Pan()
                        .onStart(() => {
                            runOnJS(onDragStart)(index);
                        })
                        .onUpdate((e) => {
                            runOnJS(onDragUpdate)(index, e.translationX);
                        })
                }>
                    <View style={[styles.resizeHandle, { backgroundColor: theme.text }]}>
                        <GripVertical size={12} color={theme.background} />
                    </View>
                </GestureDetector>
            </View>
        </TouchableOpacity>
    );
}

// Memoize the component for performance
const FrameCell = React.memo(FrameCellComponent, (prev, next) => {
    return prev.isActive === next.isActive && prev.frame.id === next.frame.id && prev.frame.keyframe === next.frame.keyframe && prev.keyframeNumber === next.keyframeNumber && prev.theme === next.theme && prev.frame.layers === next.frame.layers;
});

export const Timeline = () => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const {
        frames,
        currentFrameIndex,
        setCurrentFrame,
        addFrame,
        deleteFrame,
        duplicateFrame,
        extendFrame,
        isPlaying,
        togglePlayback
    } = useDrawingStore();

    // Ref to track last extended count for the current gesture per frame
    const dragTracker = React.useRef<{ [key: number]: number }>({});

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentFrame((currentFrameIndex + 1) % frames.length);
            }, 100); // 10 FPS
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentFrameIndex, frames.length, setCurrentFrame]);

    const FRAME_WIDTH = 40;

    const handleScrub = (x: number) => {
        const index = Math.floor(x / FRAME_WIDTH);
        const clampedIndex = Math.max(0, Math.min(index, frames.length - 1));

        if (clampedIndex !== currentFrameIndex) {
            setCurrentFrame(clampedIndex);
        }
    };

    const scrubGesture = Gesture.Pan()
        .onStart((e) => {
            runOnJS(handleScrub)(e.x);
        })
        .onUpdate((e) => {
            runOnJS(handleScrub)(e.x);
        });

    const handleAction = (action: 'delete' | 'duplicate' | 'extend') => {
        const index = currentFrameIndex;

        switch (action) {
            case 'delete':
                if (frames.length > 1) {
                    deleteFrame(index);
                }
                break;
            case 'duplicate':
                duplicateFrame(index);
                break;
            case 'extend':
                extendFrame(index, 1);
                break;
        }
    };

    const handleDragStart = (index: number) => {
        dragTracker.current[index] = 0;
        useDrawingStore.getState().pushToUndoStack();
    };

    const handleDragUpdate = (index: number, translationX: number) => {
        const framesToAdd = Math.floor(translationX / FRAME_WIDTH);
        const lastFrames = dragTracker.current[index] || 0;

        if (framesToAdd !== lastFrames) {
            const diff = framesToAdd - lastFrames;
            extendFrame(index, diff, true); // true = suppress history since we pushed at start
            dragTracker.current[index] = framesToAdd;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>

            {/* Playback Controls */}
            <View style={[styles.controls, { borderBottomColor: theme.border }]}>
                <View style={styles.playbackButtons}>
                    <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.panelBackground }]} onPress={() => setCurrentFrame(0)}>
                        <SkipBack size={18} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.panelBackground }]} onPress={togglePlayback}>
                        {isPlaying ? <Pause size={18} color={theme.tint} /> : <Play size={18} color={theme.text} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: theme.panelBackground }]}
                        onPress={() => setCurrentFrame((currentFrameIndex + 1) % frames.length)}
                    >
                        <SkipForward size={18} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* Frame Actions */}
                <View style={styles.frameActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.panelBackground }]}
                        onPress={() => handleAction('duplicate')}
                        disabled={frames.length === 0}
                    >
                        <Copy size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.panelBackground }]}
                        onPress={() => handleAction('extend')}
                        disabled={frames.length === 0}
                    >
                        <ArrowRight size={16} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.panelBackground }]}
                        onPress={() => handleAction('delete')}
                        disabled={frames.length <= 1}
                    >
                        <Trash2 size={16} color={frames.length <= 1 ? theme.border : '#ff4444'} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.tint || '#007AFF' }]} onPress={addFrame}>
                    <Plus size={16} color="#fff" />
                    <Text style={styles.addButtonText}>Add Frame</Text>
                </TouchableOpacity>
            </View>

            {/* Timeline Strip */}
            <View style={styles.timelineArea}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scroller}
                    contentContainerStyle={{ paddingRight: 100 }}
                >
                    <View>
                        {/* Ruler Header (Scrubbable) */}
                        <GestureDetector gesture={scrubGesture}>
                            <View style={[styles.rulerRow, { backgroundColor: theme.panelBackground, borderBottomColor: theme.border }]}>
                                {frames.map((_, index) => (
                                    <View key={`ruler-${index}`} style={[styles.rulerMark, { width: FRAME_WIDTH, borderColor: theme.border }]}>
                                        <Text style={[styles.rulerText, { color: theme.text }]}>
                                            {(index + 1) % 5 === 0 || index === 0 ? index + 1 : ''}
                                        </Text>
                                        <View style={[styles.rulerTick, { backgroundColor: theme.border }]} />
                                    </View>
                                ))}
                            </View>
                        </GestureDetector>

                        {/* Frame Cells Track */}
                        <View style={styles.trackRow}>
                            {frames.map((frame, index) => {
                                // Calculate keyframe number: count keyframes up to this point
                                let keyframeNumber = 0;
                                for (let i = 0; i <= index; i++) {
                                    if (frames[i].keyframe !== false) {
                                        keyframeNumber++;
                                    }
                                }
                                // If this is a hold frame, use the last keyframe's number
                                if (frame.keyframe === false) {
                                    // Find the previous keyframe
                                    for (let i = index - 1; i >= 0; i--) {
                                        if (frames[i].keyframe !== false) {
                                            break;
                                        }
                                    }
                                }

                                return (
                                    <FrameCell
                                        key={frame.id}
                                        frame={frame}
                                        index={index}
                                        isActive={currentFrameIndex === index}
                                        theme={theme}
                                        frameWidth={FRAME_WIDTH}
                                        keyframeNumber={keyframeNumber}
                                        onPress={setCurrentFrame}
                                        onDragStart={handleDragStart}
                                        onDragUpdate={handleDragUpdate}
                                    />
                                );
                            })}
                        </View>

                        {/* Playhead Indicator */}
                        <View
                            style={[
                                styles.playhead,
                                {
                                    left: currentFrameIndex * FRAME_WIDTH,
                                    backgroundColor: 'red'
                                }
                            ]}
                            pointerEvents="none"
                        >
                            <View style={styles.playheadKnob} />
                            <View style={styles.playheadLine} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 140,
        borderTopWidth: 1,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    playbackButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    controlButton: {
        padding: 6,
        borderRadius: 4,
    },
    divider: {
        width: 1,
        height: 20,
        marginHorizontal: 10,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        gap: 6,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    timelineArea: {
        flex: 1,
        flexDirection: 'row',
    },
    scroller: {
        flex: 1,
    },
    rulerRow: {
        flexDirection: 'row',
        height: 24,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
    },
    rulerMark: {
        height: '100%',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        borderRightWidth: 1,
        paddingLeft: 2,
    },
    rulerText: {
        fontSize: 10,
        marginBottom: 2,
        marginLeft: 2,
        opacity: 0.7,
    },
    rulerTick: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 1,
        height: 4,
    },
    trackRow: {
        flexDirection: 'row',
        paddingTop: 0,
    },
    frameCell: {
        height: 40, // Height of the cell on the track
        marginRight: 0, // Continuous strip
        borderRightWidth: 1,
        borderBottomWidth: 1,
        justifyContent: 'center',
        padding: 2,
    },
    cellContent: {
        flex: 1,
        borderRadius: 2,
    },
    thumbnailContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    frameNumber: {
        position: 'absolute',
        top: 2,
        left: 2,
        fontSize: 9,
        fontWeight: '600',
        opacity: 0.8,
    },
    playhead: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        zIndex: 10,
        alignItems: 'center',
    },
    playheadKnob: {
        width: 9,
        height: 9,
        backgroundColor: 'red',
        transform: [{ rotate: '45deg' }],
        marginTop: -4, // Half of height to center on top edge
    },
    playheadLine: {
        width: 1,
        flex: 1,
        backgroundColor: 'red',
    },
    frameActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 6,
        borderRadius: 4,
    },
    resizeHandleContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    resizeHandle: {
        width: 4,
        height: 20,
        borderRadius: 2,
        opacity: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
