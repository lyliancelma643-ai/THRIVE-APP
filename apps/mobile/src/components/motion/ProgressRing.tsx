import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useWeb } from '../../design/web';
import { DUR, ease } from './anim';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const C = 490.1; // 2π × 78

/**
 * Anneau de progression (r78, trait 16, départ à −90°). S'anime seulement quand `value` change (ou à la première
 * apparition avec `animate`) ; `animate={false}` affiche directement la valeur. `value` : 0..1.
 * Exception documentée à « transform/opacity » : `stroke-dashoffset`.
 */
export function ProgressRing({ value, size = 180, animate = true, children }: { value: number; size?: number; animate?: boolean; children?: ReactNode }) {
  const w = useWeb();
  const v = Math.max(0, Math.min(1, value));
  const off = useRef(new Animated.Value(animate && !w.reduceMotion ? C : C * (1 - v))).current;
  useEffect(() => {
    if (!animate || w.reduceMotion) {
      off.setValue(C * (1 - v));
      return;
    }
    Animated.timing(off, { toValue: C * (1 - v), duration: DUR.ring, easing: ease.out, useNativeDriver: false }).start();
  }, [v, animate, w.reduceMotion, off]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 180 180" style={{ position: 'absolute' }}>
        <Circle cx={90} cy={90} r={78} stroke={w.track} strokeWidth={16} fill="none" />
        {v > 0 ? (
        <AnimatedCircle
          cx={90} cy={90} r={78} stroke={w.accentInk} strokeWidth={16} fill="none" strokeLinecap="round"
          strokeDasharray={`${C},${C}`} strokeDashoffset={off as unknown as number} transform="rotate(-90 90 90)"
        />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
