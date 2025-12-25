import { Colors } from '@/constants/theme';
import { useDrawingStore } from '@/store/useDrawingStore';
import { Pause, Play, Plus, SkipBack, SkipForward } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';

export const Timeline = () => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const {
        frames,
        currentFrameIndex,
        setCurrentFrame,
        addFrame,
        isPlaying,
        togglePlayback
    } = useDrawingStore();

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentFrame((currentFrameIndex + 1) % frames.length);
            }, 100); // 10 FPS
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentFrameIndex, frames.length, setCurrentFrame]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={styles.controls}>
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.panelBackground }]} onPress={() => setCurrentFrame(0)}>
                    <SkipBack size={20} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: theme.panelBackground }]} onPress={togglePlayback}>
                    {isPlaying ? <Pause size={20} color={theme.tint} /> : <Play size={20} color={theme.text} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: theme.panelBackground }]}
                    onPress={() => setCurrentFrame((currentFrameIndex + 1) % frames.length)}
                >
                    <SkipForward size={20} color={theme.text} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TouchableOpacity style={styles.addButton} onPress={addFrame}>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addButtonText}>New Frame</Text>
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frameStrip}>
                {frames.map((frame, index) => (
                    <TouchableOpacity
                        key={frame.id}
                        style={[
                            styles.frameCell,
                            { backgroundColor: theme.paper, borderColor: theme.border },
                            currentFrameIndex === index && styles.activeFrameCell
                        ]}
                        onPress={() => setCurrentFrame(index)}
                    >
                        <Text style={[
                            styles.frameNumber,
                            { color: theme.icon },
                            currentFrameIndex === index && styles.activeFrameText
                        ]}>
                            {index + 1}
                        </Text>
                        <View style={[styles.frameThumbnail, { backgroundColor: theme.paper, borderColor: theme.border }]}>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 120,
        borderTopWidth: 1,
        padding: 10,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    controlButton: {
        padding: 8,
        borderRadius: 6,
    },
    divider: {
        width: 1,
        height: 20,
        marginHorizontal: 5,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 5,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    frameStrip: {
        flex: 1,
    },
    frameCell: {
        width: 60,
        height: 50,
        borderWidth: 1,
        marginRight: 4,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeFrameCell: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD',
        borderWidth: 2,
    },
    frameNumber: {
        fontSize: 10,
        position: 'absolute',
        top: 2,
        left: 4,
    },
    activeFrameText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    frameThumbnail: {
        width: 40,
        height: 30,
        borderRadius: 2,
        borderWidth: 1,
    }
});
