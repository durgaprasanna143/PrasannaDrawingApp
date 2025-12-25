import { DrawingCanvas } from '@/components/canvas/DrawingCanvas';
import { Timeline } from '@/components/timeline/Timeline';
import { ColorPanel } from '@/components/ui/panels/ColorPanel';
import { LayerPanel } from '@/components/ui/panels/LayerPanel';
import { ToolBar } from '@/components/ui/panels/ToolBar';
import { Colors } from '@/constants/theme';
import React from 'react';
import { StatusBar, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudioScreen() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isLandscape = width > height;
  const isTablet = width > 768;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {/* Main Workspace */}
        <View style={[
          styles.workspace,
          { flexDirection: isLandscape ? 'row' : 'column' }
        ]}>
          {/* Top/Left Toolbar */}
          <View style={[isLandscape ? styles.leftSide : styles.topSide, { backgroundColor: theme.toolbar }]}>
            <ToolBar horizontal={!isLandscape} />
          </View>

          {/* Center Canvas Area */}
          <View style={[styles.canvasArea, { backgroundColor: theme.canvasBackground }]}>
            <DrawingCanvas />
          </View>

          {/* Right/Bottom Panels */}
          <View style={[
            isLandscape ? styles.rightSidebar : styles.bottomSidebar,
            { backgroundColor: theme.sidebar, borderColor: theme.border },
            (!isLandscape && !isTablet) && { height: 200 }
          ]}>
            <ColorPanel horizontal={!isLandscape} />
            <LayerPanel />
          </View>
        </View>

        {/* Bottom Timeline */}
        <Timeline />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  workspace: {
    flex: 1,
  },
  leftSide: {
    width: 60,
  },
  topSide: {
    height: 60,
    width: '100%',
  },
  canvasArea: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightSidebar: {
    width: 240,
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  bottomSidebar: {
    width: '100%',
    height: 240,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
  },
});

