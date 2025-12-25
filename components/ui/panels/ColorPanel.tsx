import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useDrawingStore } from '../../../store/useDrawingStore';
import { ColorWheel } from '../ColorWheel';

const ColorPreview = ({ color }: { color: string }) => {
    return (
        <View style={styles.previewContainer}>
            <View style={[styles.previewCircle, { backgroundColor: color }]} />
            <Text style={[styles.hexText, { color: color }]}>{color.toUpperCase()}</Text>
        </View>
    );
};

const RGBSliders = ({ color, onColorChange }: { color: string, onColorChange: (c: string) => void }) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    return (
        <View style={styles.rgbSection}>
            {['R', 'G', 'B'].map((label, i) => {
                const val = [r, g, b][i];
                return (
                    <View key={label} style={styles.rgbRow}>
                        <Text style={[styles.rgbLabel, { color: color }]}>{label}</Text>
                        <View style={styles.rgbTrackBase}>
                            <View
                                style={[
                                    styles.rgbTrackFill,
                                    {

                                        width: `${(val / 255) * 100}%`,
                                        backgroundColor: label === 'R' ? '#ff4444' : label === 'G' ? '#44ff44' : '#4444ff'
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.rgbValue, { color: color }]}>{val}</Text>
                    </View>
                );
            })}
        </View>
    );
};

export const ColorPanel = ({ horizontal }: { horizontal?: boolean }) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { brushColor, setBrushColor, brushSize, setBrushSize, recentColors, addRecentColor } = useDrawingStore();

    const handleColorChange = (newColor: string) => {
        // Only trigger store updates if the color is actually different
        if (newColor.toLowerCase() !== brushColor.toLowerCase()) {
            setBrushColor(newColor);
        }
    };

    // Only add to recent colors when interaction is finished or explicitly needed
    // to avoid flooding the store during dragging
    const handleAddRecent = (newColor: string) => {
        addRecentColor(newColor);
    };

    return (
        <View style={[
            styles.container,
            horizontal && styles.containerHorizontal,
            { backgroundColor: theme.sidebar, borderBottomColor: theme.border, borderRightColor: theme.border }
        ]}>
            <View style={[styles.section, horizontal && styles.sectionHorizontal]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.sectionTitle, { color: theme.icon }]}>Navigator</Text>
                    <ColorPreview color={brushColor} />
                </View>

                <View style={[styles.colorWheelContainer, { width: '100%', overflow: 'hidden' }]}>
                    <ColorWheel
                        color={brushColor}
                        onColorChange={handleColorChange}
                        onSelectionCommit={handleAddRecent}
                        size={horizontal ? 130 : 170}
                    />
                </View>

                {!horizontal && <RGBSliders color={brushColor} onColorChange={handleColorChange} />}

                {!horizontal && (
                    <View style={styles.recentSection}>
                        <Text style={[styles.sectionTitle, { color: theme.icon, marginBottom: 8 }]}>Recent</Text>
                        <View style={styles.recentGrid}>
                            {recentColors.map((c, i) => (
                                <TouchableOpacity
                                    key={`${c}-${i}`}
                                    style={[styles.recentSwatch, { backgroundColor: c }]}
                                    onPress={() => setBrushColor(c)}
                                />
                            ))}
                        </View>
                    </View>
                )}
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.sizeSection, horizontal && styles.sizeSectionHorizontal]}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Brush Size</Text>
                <View style={styles.sizeGrid}>
                    {[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].map(s => (
                        <TouchableOpacity
                            key={s}
                            style={[
                                styles.sizeButton,
                                { backgroundColor: theme.panelBackground, borderColor: theme.border },
                                brushSize === s && styles.activeSize
                            ]}
                            onPress={() => setBrushSize(s)}
                        >
                            <Text style={[
                                styles.sizeText,
                                { color: theme.text },
                                brushSize === s && styles.activeSizeText
                            ]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderBottomWidth: 1,
    },
    containerHorizontal: {
        flexDirection: 'column',
        padding: 12,
        borderRightWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    section: {
        flexDirection: 'column',
    },
    sectionHorizontal: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: 4,
        paddingHorizontal: 8,
        borderRadius: 20,
    },
    previewCircle: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    hexText: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: 'monospace',
        opacity: 0.7,
    },
    colorWheelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
    },
    rgbSection: {
        gap: 6,
        marginTop: 8,
    },
    rgbRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rgbLabel: {
        fontSize: 10,
        width: 12,
        fontWeight: '700',
        opacity: 0.5,
    },
    rgbTrackBase: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    rgbTrackFill: {
        height: '100%',
        borderRadius: 2,
    },
    rgbValue: {
        fontSize: 10,
        width: 24,
        textAlign: 'right',
        opacity: 0.8,
    },
    recentSection: {
        marginTop: 20,
    },
    recentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    recentSwatch: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 20,
        opacity: 0.5,
    },
    sizeSection: {
        flexDirection: 'column',
    },
    sizeSectionHorizontal: {
        flex: 1,
    },
    sizeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    sizeButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    activeSize: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    sizeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    activeSizeText: {
        color: '#fff',
        fontWeight: '800',
    }
});
