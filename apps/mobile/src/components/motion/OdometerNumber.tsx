import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { WText, useWeb } from '../../design/web';
import { ease } from './anim';

/** Un chiffre = une colonne 0‒9 qui défile (`translateY`, 600 ms). */
function Digit({ digit, from, size, lh, animate, display }: { digit: number; from: number; size: number; lh: number; animate: boolean; display: boolean }) {
  const w = useWeb();
  const v = useRef(new Animated.Value(animate && !w.reduceMotion ? from : digit)).current;
  useEffect(() => {
    if (!animate || w.reduceMotion) {
      v.setValue(digit);
      return;
    }
    Animated.timing(v, { toValue: digit, duration: 600, easing: ease.out, useNativeDriver: true }).start();
  }, [digit, animate, w.reduceMotion, v]);
  return (
    <View style={{ height: lh, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY: Animated.multiply(v, -lh) }] }}>
        {Array.from({ length: 10 }, (_, d) => (
          <WText key={d} display={display} size={size} lh={lh} weight={display ? 600 : 700} tone="ink" style={{ fontVariant: ['tabular-nums'] }}>
            {d}
          </WText>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Compteur à chiffres qui défilent, de `from` vers `value`. `animate={false}` : valeur finale directe (retour sur
 * un onglet, synthèse passée…). Le lecteur d'écran lit la valeur finale d'un seul bloc.
 */
export function OdometerNumber({ value, from, size = 36, lh, animate = true, display = false }: { value: number; from?: number; size?: number; lh?: number; animate?: boolean; display?: boolean }) {
  const line = lh ?? Math.round(size * 1.15);
  const to = String(Math.max(0, Math.round(value)));
  const start = String(Math.max(0, Math.round(from ?? 0))).padStart(to.length, '0').slice(-to.length);
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel={to} accessibilityRole="text">
      {to.split('').map((d, i) => (
        <Digit key={`${to.length}-${i}`} digit={Number(d)} from={Number(start[i])} size={size} lh={line} animate={animate} display={display} />
      ))}
    </View>
  );
}
