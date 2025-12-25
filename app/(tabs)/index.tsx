import { DrawingCanvas } from '@/components/canvas/DrawingCanvas';
import { Timeline } from '@/components/timeline/Timeline';
import { ColorPanel } from '@/components/ui/panels/ColorPanel';
import { LayerPanel } from '@/components/ui/panels/LayerPanel';
import { ToolBar } from '@/components/ui/panels/ToolBar';
import { Colors } from '@/constants/theme';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function StudioScreen() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isLandscape = width > height;
  const isTablet = width > 768;

  const sidebarWidth = useSharedValue(240);
  const contextWidth = useSharedValue(0);
  const [isResizing, setIsResizing] = React.useState(false);

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
  }));

  const resizeGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsResizing)(true);
      contextWidth.value = sidebarWidth.value;
    })
    .onUpdate((e) => {
      const newWidth = contextWidth.value - e.translationX;
      sidebarWidth.value = Math.max(50, Math.min(newWidth, 450));
    })
    .onEnd(() => {
      runOnJS(setIsResizing)(false);
    });

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
          {isLandscape ? (
            <>
              <GestureDetector gesture={resizeGesture}>
                <View style={[
                  styles.resizeHandle,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  isResizing && { borderColor: theme.tint }
                ]}
                  hitSlop={{ left: 10, right: 10 }} // Increase touch area
                >
                  <View style={[styles.resizeHandleGrip, { backgroundColor: theme.icon }]} />
                </View>
              </GestureDetector>

              <Animated.View
                style={[
                  styles.rightSidebar,
                  {
                    backgroundColor: theme.sidebar,
                    borderColor: theme.border,
                  },
                  animatedSidebarStyle
                ]}
              >
                <ScrollView
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={{ flexGrow: 1 }}
                  showsVerticalScrollIndicator={false}
                >
                  <ColorPanel horizontal={false} />
                  <LayerPanel scrollable={false} />
                  <View style={{ height: 40 }} />
                </ScrollView>
              </Animated.View>
            </>
          ) : (
            <View style={[
              styles.bottomSidebar,
              { backgroundColor: theme.sidebar, borderColor: theme.border },
              (!isLandscape && !isTablet) && { height: 200 }
            ]}>
              <ColorPanel horizontal={true} />
              <LayerPanel />
            </View>
          )}
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
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    overflow: 'hidden',
  },
  resizeHandle: {
    width: 14,
    height: '100%',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    marginRight: -1, // Overlap the sidebar border seamlessly
  },
  resizeHandleGrip: {
    width: 4,
    height: 32,
    borderRadius: 2,
    opacity: 0.2, // Subtle but visible handle
  },
  bottomSidebar: {
    width: '100%',
    height: 240,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
  },
});
