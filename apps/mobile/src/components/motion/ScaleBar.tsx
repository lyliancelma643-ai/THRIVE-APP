import { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useWeb } from '../../design/web';
import { DUR, ease } from './anim';

/**
 * Barre de progression de 6 px en `scaleX` (jamais `width`), ancrée à gauche.
 * `progress` : 0..1 ; `null` = indéterminée (trait qui glisse, sobre).
 */
export function ScaleBar({ progress, width = 260, height = 6, color, style }: { progress: number | null; width?: number; height?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const w = useWeb();
  const v = useRef(new Animated.Value(progress ?? 0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (progress === null) return;
    Animated.timing(v, { toValue: progress, duration: w.reduceMotion ? DUR.fast : DUR.bar, easing: ease.out, useNativeDriver: true }).start();
  }, [progress, v, w.reduceMotion]);
  useEffect(() => {
    if (progress !== null || w.reduceMotion) return;
    const loop = Animated.loop(Animated.timing(slide, { toValue: 1, duration: 1400, easing: ease.inOut, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [progress, slide, w.reduceMotion]);
  const fill = color ?? w.accentInk;
  const r = height / 2;
  return (
    <View style={[{ width, height, borderRadius: r, backgroundColor: w.track, overflow: 'hidden' }, style]}>
      {progress === null ? (
        <Animated.View
          style={{
            width: width * 0.35, height, borderRadius: r, backgroundColor: fill, opacity: w.reduceMotion ? 0.6 : 1,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.35, width] }) }],
          }}
        />
      ) : (
        <Animated.View
          style={{
            width, height, borderRadius: r, backgroundColor: fill,
            transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) }],
          }}
        />
      )}
    </View>
  );
}
