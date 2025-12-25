import { Colors } from '@/constants/theme';
import {
    Eraser,
    LassoSelect,
    MousePointer2,
    PaintBucket,
    Pencil,
    Redo2,
    Undo2
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Tool, useDrawingStore } from '../../../store/useDrawingStore';

const TOOLS: { id: Tool; icon: any; label: string }[] = [
    { id: 'brush', icon: Pencil, label: 'Brush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'lasso', icon: LassoSelect, label: 'Lasso' },
    { id: 'move', icon: MousePointer2, label: 'Move' },
    { id: 'bucket', icon: PaintBucket, label: 'Fill' },
];

export const ToolBar = ({ horizontal }: { horizontal?: boolean }) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { selectedTool, setTool, undo, redo } = useDrawingStore();

    return (
        <View style={[
            styles.container,
            horizontal && styles.containerHorizontal,
            { backgroundColor: theme.toolbar, borderColor: theme.border }
        ]}>
            <View style={[styles.section, horizontal && styles.sectionHorizontal]}>
                {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = selectedTool === tool.id;
                    return (
                        <TouchableOpacity
                            key={tool.id}
                            style={[
                                styles.toolButton,
                                { backgroundColor: theme.panelBackground, borderColor: theme.border },
                                isActive && styles.activeTool
                            ]}
                            onPress={() => setTool(tool.id)}
                        >
                            <Icon size={22} color={isActive ? '#fff' : theme.text} />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={[styles.divider, horizontal && styles.dividerHorizontal, { backgroundColor: theme.border }]} />

            <View style={[styles.section, horizontal && styles.sectionHorizontal]}>
                <TouchableOpacity
                    style={[styles.toolButton, { backgroundColor: theme.panelBackground, borderColor: theme.border }]}
                    onPress={undo}
                >
                    <Undo2 size={22} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toolButton, { backgroundColor: theme.panelBackground, borderColor: theme.border }]}
                    onPress={redo}
                >
                    <Redo2 size={22} color={theme.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        height: '100%',
        borderRightWidth: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    containerHorizontal: {
        width: '100%',
        height: 60,
        flexDirection: 'row',
        paddingVertical: 0,
        paddingHorizontal: 10,
        borderRightWidth: 0,
        borderBottomWidth: 1,
        justifyContent: 'space-between',
    },
    section: {
        gap: 12,
    },
    sectionHorizontal: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        width: 30,
        marginVertical: 15,
    },
    dividerHorizontal: {
        height: 30,
        width: 1,
        marginVertical: 0,
        marginHorizontal: 15,
    },
    toolButton: {
        width: 42,
        height: 42,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    activeTool: {
        backgroundColor: '#007AFF',
        borderColor: '#0056b3',
    },
});
