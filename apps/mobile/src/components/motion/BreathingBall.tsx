import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AccentButton, WText, useWeb } from '../../design/web';
import { ease } from './anim';

type Phase = 'inspire' | 'expire' | 'fin';
const IN_S = 4;
const OUT_S = 6;

/**
 * Un souffle avant de commencer : inspiration 4 s (la balle grandit), expiration 6 s (elle rétrécit), puis
 * « Voilà. ». Toujours avec « Passer ». Réduire les animations : on garde les chiffres, la balle reste fixe.
 */
export function BreathingBall({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const w = useWeb();
  const scale = useRef(new Animated.Value(0.62)).current;
  const [phase, setPhase] = useState<Phase>('inspire');
  const [count, setCount] = useState(1);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = (p: Phase, secs: number, next: () => void) => {
      if (!alive) return;
      setPhase(p);
      setCount(1);
      if (!w.reduceMotion) Animated.timing(scale, { toValue: p === 'inspire' ? 1 : 0.62, duration: secs * 1000, easing: ease.inOut, useNativeDriver: true }).start();
      for (let i = 2; i <= secs; i++) timers.push(setTimeout(() => alive && setCount(i), (i - 1) * 1000));
      timers.push(setTimeout(next, secs * 1000));
    };
    run('inspire', IN_S, () => run('expire', OUT_S, () => alive && setPhase('fin')));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      scale.stopAnimation();
    };
  }, [scale, w.reduceMotion]);

  const label = phase === 'inspire' ? 'Inspire par le nez' : phase === 'expire' ? 'Souffle doucement' : 'Voilà.';
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16, gap: 18 }}>
      <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Svg width={280} height={280} style={{ position: 'absolute' }}>
          <Circle cx={140} cy={140} r={130} fill="none" stroke={w.line2} strokeWidth={2} strokeDasharray="3 8" strokeLinecap="round" />
        </Svg>
        <Animated.View
          style={{
            width: 260, height: 260, borderRadius: 130, backgroundColor: w.accent, borderWidth: w.isNight ? 0 : 3, borderColor: w.text,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: w.reduceMotion ? (phase === 'fin' ? 0.62 : 1) : scale }],
          }}
        />
        <View style={{ position: 'absolute' }}>
          {phase !== 'fin' ? (
            <WText size={56} lh={64} weight={700} color={w.onAccent} style={{ fontVariant: ['tabular-nums'] }}>
              {count}
            </WText>
          ) : null}
        </View>
      </View>
      <View accessibilityLiveRegion="polite">
        <WText display size={26} lh={32} weight={600} tone="ink" center>
          {label}
        </WText>
      </View>
      {phase === 'fin' ? (
        <AccentButton label="Commencer l’activité" height={52} onPress={onDone} />
      ) : (
        <Pressable onPress={onSkip} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}>
          <WText size={15} weight={600} tone="soft">Passer</WText>
        </Pressable>
      )}
    </View>
  );
}
