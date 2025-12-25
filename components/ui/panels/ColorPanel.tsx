import { Colors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useDrawingStore } from '../../../store/useDrawingStore';

const BRUSH_COLORS = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#8b4513'
];

export const ColorPanel = ({ horizontal }: { horizontal?: boolean }) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { brushColor, setBrushColor, brushSize, setBrushSize } = useDrawingStore();

    return (
        <View style={[
            styles.container,
            horizontal && styles.containerHorizontal,
            { backgroundColor: theme.sidebar, borderBottomColor: theme.border, borderRightColor: theme.border }
        ]}>
            <View style={[styles.section, horizontal && styles.sectionHorizontal]}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Colors</Text>
                <View style={styles.colorGrid}>
                    {BRUSH_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorSwatch,
                                { backgroundColor: color, borderColor: theme.border },
                                brushColor === color && styles.activeSwatch
                            ]}
                            onPress={() => setBrushColor(color)}
                        />
                    ))}
                </View>
            </View>

            {horizontal && <View style={[styles.dividerHorizontal, { backgroundColor: theme.border }]} />}

            <View style={[styles.sizeSection, horizontal && styles.sizeSectionHorizontal]}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Size: {brushSize}px</Text>
                <View style={styles.sizeControls}>
                    {[2, 5, 10, 20, 50].map(s => (
                        <TouchableOpacity
                            key={s}
                            style={[
                                styles.sizeButton,
                                { backgroundColor: theme.panelBackground },
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
        padding: 12,
        borderBottomWidth: 1,
    },
    containerHorizontal: {
        flex: 1,
        flexDirection: 'column',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRightWidth: 1,
        borderBottomWidth: 0,
    },
    section: {
        flexDirection: 'column',
    },
    sectionHorizontal: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
    },
    activeSwatch: {
        borderColor: '#007AFF',
        borderWidth: 2,
        transform: [{ scale: 1.1 }],
    },
    dividerHorizontal: {
        width: 1,
        height: '60%',
    },
    sizeSection: {
        marginTop: 5,
    },
    sizeSectionHorizontal: {
        marginTop: 0,
        flex: 1,
    },
    sizeControls: {
        flexDirection: 'row',
        gap: 5,
    },
    sizeButton: {
        width: 32,
        height: 32,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeSize: {
        backgroundColor: '#007AFF',
    },
    sizeText: {
        fontSize: 10,
    },
    activeSizeText: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
