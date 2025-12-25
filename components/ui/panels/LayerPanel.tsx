import { Colors } from '@/constants/theme';
import { Copy, Eye, EyeOff, Layers, Lock, Plus, Trash2, Unlock } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useDrawingStore } from '../../../store/useDrawingStore';

const LayerListContent = () => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { frames, currentFrameIndex, currentLayerId, selectLayer, toggleLayerVisibility, deleteLayer, duplicateLayer, toggleLayerLock } = useDrawingStore();
    const currentFrame = frames[currentFrameIndex];

    return (
        <>
            {[...currentFrame.layers].reverse().map((layer) => {
                const isActive = currentLayerId === layer.id;
                return (
                    <View key={layer.id} style={{ flexDirection: 'column' }}>
                        <TouchableOpacity
                            style={[
                                styles.layerItem,
                                { backgroundColor: theme.panelBackground, borderBottomColor: theme.border },
                                isActive && [styles.activeLayer, { backgroundColor: colorScheme === 'dark' ? '#1A3350' : '#E3F2FD' }]
                            ]}
                            onPress={() => selectLayer(layer.id)}
                        >
                            <View style={styles.layerControls}>
                                <TouchableOpacity onPress={() => toggleLayerVisibility(layer.id)}>
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
                                {layer.locked && <Lock size={14} color={theme.icon} />}
                            </View>
                        </TouchableOpacity>

                        {isActive && (
                            <View style={[styles.optionsRow, { backgroundColor: theme.sidebar, borderBottomColor: theme.border }]}>
                                <TouchableOpacity style={styles.optionButton} onPress={() => deleteLayer(layer.id)}>
                                    <Trash2 size={14} color={theme.error || '#ff4444'} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.optionButton} onPress={() => duplicateLayer(layer.id)}>
                                    <Copy size={14} color={theme.icon} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.optionButton} onPress={() => toggleLayerLock(layer.id)}>
                                    {layer.locked ? <Unlock size={14} color={theme.icon} /> : <Lock size={14} color={theme.icon} />}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}
        </>
    );
};

export const LayerPanel = ({ scrollable = true }: { scrollable?: boolean }) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { addLayer } = useDrawingStore();

    return (
        // When scrollable is false (inside a parent ScrollView), we want auto-height (flex: 0)
        // When scrollable is true (standalone), we want to fill available space (flex: 1)
        <View style={[
            styles.container,
            !scrollable && { flex: 0 },
            { backgroundColor: theme.panelBackground }
        ]}>
            <View style={[styles.header, { backgroundColor: theme.sidebar, borderBottomColor: theme.border }]}>
                <Layers size={18} color={theme.icon} />
                <Text style={[styles.title, { color: theme.text }]}>Layers</Text>
                <TouchableOpacity style={styles.headerAction} onPress={addLayer}>
                    <Plus size={18} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {scrollable ? (
                <ScrollView style={styles.layerList}>
                    <LayerListContent />
                </ScrollView>
            ) : (
                <View style={[styles.layerList, { flex: 0 }]}>
                    <LayerListContent />
                </View>
            )}

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
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 4,
        borderBottomWidth: 1,
    },
    optionButton: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
