import {
    Canvas,
    Group,
    LinearGradient,
    Paint,
    Rect,
    vec
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

interface ColorWheelProps {
    color: string;
    onColorChange: (color: string) => void;
    onSelectionCommit?: (color: string) => void;
    size?: number;
}

const hsvToRgb = (h: number, s: number, v: number) => {
    'worklet';
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsv = (hex: string) => {
    'worklet';
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, v };
};

export const ColorWheel = ({ color, onColorChange, onSelectionCommit, size = 200 }: ColorWheelProps) => {
    const hueSliderHeight = 16;
    const gap = 12;
    const svSize = size - hueSliderHeight - gap;

    // Initial HSV from prop
    const initialHsv = useMemo(() => hexToHsv(color), [color]);

    // Shared values for high-performance interactive updates
    const h = useSharedValue(initialHsv.h);
    const s = useSharedValue(initialHsv.s);
    const v = useSharedValue(initialHsv.v);

    // This state is just for the Skia hue square background
    const [squareHue, setSquareHue] = React.useState(initialHsv.h);

    // Sync shared values if color prop changes from outside
    React.useEffect(() => {
        const newHsv = hexToHsv(color);
        if (Math.abs(h.value - newHsv.h) > 0.001) h.value = newHsv.h;
        if (Math.abs(s.value - newHsv.s) > 0.001) s.value = newHsv.s;
        if (Math.abs(v.value - newHsv.v) > 0.001) v.value = newHsv.v;
        setSquareHue(newHsv.h);
    }, [color]);

    const updateColor = (newH: number, newS: number, newV: number) => {
        const newColor = hsvToRgb(newH, newS, newV);
        // Only trigger store update if the color is actually different
        // to prevent infinite update depth
        if (newColor.toLowerCase() !== color.toLowerCase()) {
            onColorChange(newColor);
        }

        // Only update local state if hue changed significantly
        if (Math.abs(newH - squareHue) > 0.005) {
            setSquareHue(newH);
        }
    };

    const handleHueInteraction = (x: number) => {
        'worklet';
        const newH = Math.max(0, Math.min(1, x / size));
        h.value = newH;
        runOnJS(updateColor)(newH, s.value, v.value);
    };

    const handleSVInteraction = (x: number, y: number) => {
        'worklet';
        const localX = Math.max(0, Math.min(1, x / size));
        const localY = Math.max(0, Math.min(1, y / svSize));

        s.value = localX;
        v.value = 1 - localY;
        runOnJS(updateColor)(h.value, localX, 1 - localY);
    };

    const activeType = useSharedValue<'none' | 'hue' | 'sv'>('none');

    const gesture = Gesture.Pan()
        .minDistance(0)
        .onStart((e) => {
            'worklet';
            if (e.y > svSize + gap / 2) {
                activeType.value = 'hue';
                handleHueInteraction(e.x);
            } else if (e.y < svSize) {
                activeType.value = 'sv';
                handleSVInteraction(e.x, e.y);
            }
        })
        .onUpdate((e) => {
            'worklet';
            if (activeType.value === 'hue') {
                handleHueInteraction(e.x);
            } else if (activeType.value === 'sv') {
                handleSVInteraction(e.x, e.y);
            }
        })
        .onEnd((e) => {
            'worklet';
            activeType.value = 'none';
            // When interaction finishes, commit the color (e.g. add to recent history)
            if (onSelectionCommit) {
                const finalColor = hsvToRgb(h.value, s.value, v.value);
                runOnJS(onSelectionCommit)(finalColor);
            }
        });

    const hueIndicatorStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: h.value * size - 6 },
                { translateY: svSize + gap + hueSliderHeight / 2 - 10 },
            ],
        };
    });

    const svIndicatorStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: s.value * size - 8 },
                { translateY: (1 - v.value) * svSize - 8 },
            ],
        };
    });

    const hueColors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];
    const currentHueBase = hsvToRgb(squareHue, 1, 1);

    return (
        <View style={{ width: size, height: size }}>
            <Canvas style={{ flex: 1 }}>
                {/* S-V Square */}
                <Group>
                    <Rect x={0} y={0} width={size} height={svSize} color={currentHueBase} />
                    <Rect x={0} y={0} width={size} height={svSize}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(size, 0)}
                            colors={['#ffffff', '#ffffff00']}
                        />
                    </Rect>
                    <Rect x={0} y={0} width={size} height={svSize}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, svSize)}
                            colors={['#00000000', '#000000']}
                        />
                    </Rect>
                    <Rect x={0} y={0} width={size} height={svSize} color="rgba(0,0,0,0.1)">
                        <Paint style="stroke" strokeWidth={1} />
                    </Rect>
                </Group>

                {/* Hue Slider */}
                <Group transform={[{ translateY: svSize + gap }]}>
                    <Rect x={0} y={0} width={size} height={hueSliderHeight}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(size, 0)}
                            colors={hueColors}
                        />
                    </Rect>
                    <Rect x={0} y={0} width={size} height={hueSliderHeight} color="rgba(0,0,0,0.1)">
                        <Paint style="stroke" strokeWidth={1} />
                    </Rect>
                </Group>
            </Canvas>

            {/* Premium Indicators */}
            <Animated.View style={[styles.svIndicator, svIndicatorStyle, { backgroundColor: color }]} pointerEvents="none">
                <View style={styles.svIndicatorInner} />
            </Animated.View>

            <Animated.View style={[styles.hueSliderIndicator, hueIndicatorStyle]} pointerEvents="none">
                <View style={[styles.indicatorCore, { backgroundColor: color }]} />
            </Animated.View>

            {/* Unified Gesture Detector */}
            <GestureDetector gesture={gesture}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    svIndicator: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2.22,
    },
    svIndicatorInner: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.3)',
    },
    hueSliderIndicator: {
        position: 'absolute',
        width: 12,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    indicatorCore: {
        width: 4,
        height: 12,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    }
});
