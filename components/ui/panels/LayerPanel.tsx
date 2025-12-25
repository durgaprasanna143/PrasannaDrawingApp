import { Colors } from '@/constants/theme';
import { Eye, EyeOff, Layers, Lock, Plus, Unlock } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useDrawingStore } from '../../../store/useDrawingStore';

export const LayerPanel = () => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { frames, currentFrameIndex, currentLayerId, selectLayer, addLayer } = useDrawingStore();
    const currentFrame = frames[currentFrameIndex];

    return (
        <View style={[styles.container, { backgroundColor: theme.panelBackground }]}>
            <View style={[styles.header, { backgroundColor: theme.sidebar, borderBottomColor: theme.border }]}>
                <Layers size={18} color={theme.icon} />
                <Text style={[styles.title, { color: theme.text }]}>Layers</Text>
                <TouchableOpacity style={styles.headerAction} onPress={addLayer}>
                    <Plus size={18} color={theme.tint} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.layerList}>
                {[...currentFrame.layers].reverse().map((layer) => {
                    const isActive = currentLayerId === layer.id;
                    return (
                        <TouchableOpacity
                            key={layer.id}
                            style={[
                                styles.layerItem,
                                { backgroundColor: theme.panelBackground, borderBottomColor: theme.border },
                                isActive && [styles.activeLayer, { backgroundColor: colorScheme === 'dark' ? '#1A3350' : '#E3F2FD' }]
                            ]}
                            onPress={() => selectLayer(layer.id)}
                        >
                            <View style={styles.layerControls}>
                                <TouchableOpacity>
                                    {layer.visible ? <Eye size={16} color={theme.icon} /> : <EyeOff size={16} color={theme.border} />}
                                </TouchableOpacity>
                            </View>

                            <Text style={[
                                styles.layerName,
                                { color: theme.text },
                                isActive && styles.activeText
                            ]}>
                                {layer.name}
                            </Text>

                            <View style={styles.layerControls}>
                                <TouchableOpacity>
                                    {layer.locked ? <Lock size={14} color={theme.icon} /> : <Unlock size={14} color={theme.border} />}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.sidebar, borderTopColor: theme.border }]}>
                <Text style={[styles.opacityLabel, { color: theme.icon }]}>Opacity 100%</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    headerAction: {
        padding: 4,
    },
    layerList: {
        flex: 1,
    },
    layerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        gap: 10,
    },
    activeLayer: {
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    layerName: {
        fontSize: 13,
        flex: 1,
    },
    activeText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    layerControls: {
        width: 24,
        alignItems: 'center',
    },
    footer: {
        padding: 10,
        borderTopWidth: 1,
    },
    opacityLabel: {
        fontSize: 11,
    }
});
