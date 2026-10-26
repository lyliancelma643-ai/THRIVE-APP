import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { DUR } from '@thrive/shared';
import { WText, useWeb } from '../../design/web';
import { ease } from './anim';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const K = 1.25; // viewBox 240×200 → rendu 300×250
const W = 300;
const H = 250;

export type SealPhase = 'ready' | 'sealing' | 'sealed';

/**
 * Durée minimale du rituel : la confirmation du serveur n'est montrée qu'après 2 400 ms, même si elle arrive avant.
 * Renvoie l'étape à afficher (`sealing` tant que le minimum n'est pas écoulé).
 */
/** Vrai quand `active` dure depuis plus de `ms` (la réponse tarde : « Encore un instant… »). */
export function useLate(active: boolean, ms: number = DUR.ritualMin): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) {
      setLate(false);
      return;
    }
    const id = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(id);
  }, [active, ms]);
  return late;
}

export function useMinSealing<T extends string>(step: T, sealing: T, sealed: T, min: number = DUR.ritualMin): T {
  const startedAt = useRef<number | null>(null);
  const [, bump] = useState(0);
  if (step === sealing && startedAt.current === null) startedAt.current = Date.now();
  if (step !== sealing && step !== sealed) startedAt.current = null;
  const waited = startedAt.current === null ? min : Date.now() - startedAt.current;
  useEffect(() => {
    if (step !== sealed || startedAt.current === null) return;
    const rest = min - (Date.now() - startedAt.current);
    if (rest <= 0) return;
    const id = setTimeout(() => bump((n) => n + 1), rest);
    return () => clearTimeout(id);
  }, [step, sealed, min]);
  return step === sealed && waited < min ? sealing : step;
}

/** L'enveloppe qui se ferme : feuille, rabat, sceau, anneau (voir la chronologie du cahier de mouvement). */
export function SealLetter({ phase, waiting = false }: { phase: SealPhase; waiting?: boolean }) {
  const w = useWeb();
  const reduce = w.reduceMotion;
  const sheet = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  const drop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(170)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const sealed = phase === 'sealed';

  useEffect(() => {
    if (phase === 'ready') {
      [sheet, flap, drop, wave].forEach((v) => v.setValue(0));
      ring.setValue(170);
      return;
    }
    if (reduce) {
      sheet.setValue(1);
      flap.setValue(1);
      drop.setValue(1);
      ring.setValue(sealed ? 0 : 170);
      return;
    }
    Animated.timing(sheet, { toValue: 1, duration: 500, easing: ease.out, useNativeDriver: true }).start();
    Animated.timing(flap, { toValue: 1, duration: 450, delay: 300, easing: ease.inOut, useNativeDriver: true }).start();
    Animated.timing(drop, { toValue: 1, duration: 450, delay: 700, easing: ease.spring, useNativeDriver: true }).start();
    const h = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined), 700);
    Animated.timing(ring, { toValue: 0, duration: 1700, delay: 700, easing: (t) => t, useNativeDriver: false }).start();
    return () => clearTimeout(h);
  }, [phase === 'ready', reduce]); // eslint-disable-line

  useEffect(() => {
    if (!sealed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    ring.setValue(0);
    if (!reduce) Animated.timing(wave, { toValue: 1, duration: 800, easing: ease.out, useNativeDriver: true }).start();
  }, [sealed, reduce, ring, wave]);

  useEffect(() => {
    if (!waiting || sealed || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.7, duration: 700, easing: ease.inOut, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 700, easing: ease.inOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      breathe.setValue(1);
    };
  }, [waiting, sealed, reduce, breathe]);

  const body = w.isNight ? w.surface : w.paper;
  const paper = w.isNight ? w.paper : w.surface;
  const edge = w.line2;
  const sealX = 120 * K;
  const sealY = (118 + 20) * K;
  const layer = { position: 'absolute' as const, left: 0, top: 0, width: W, height: H };

  return (
    <View style={{ width: W, height: H, alignSelf: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={W} height={H} viewBox="0 -20 240 200" style={layer}>
        <Rect x={20} y={60} width={200} height={110} rx={12} fill={body} stroke={edge} strokeWidth={1.5} />
      </Svg>
      {/* La feuille ne dépasse jamais le bas de l'enveloppe. */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: (170 - 2 + 20) * K, overflow: 'hidden' }}>
        <Animated.View style={[layer, { transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [0, 46 * K] }) }] }]}>
          <Svg width={W} height={H} viewBox="0 -20 240 200">
            <Rect x={42} y={28} width={156} height={118} rx={6} fill={paper} stroke={edge} strokeWidth={1.5} />
            {[[46, 90], [62, 124], [78, 110], [94, 70]].map(([y, wd]) => (
              <Rect key={y} x={58} y={y} width={wd} height={6} rx={3} fill={w.track} />
            ))}
          </Svg>
        </Animated.View>
      </View>
      <Svg width={W} height={H} viewBox="0 -20 240 200" style={layer}>
        {/* La feuille n'est visible qu'au-dessus de l'enveloppe : en descendant, elle y entre. */}
        <Rect x={20} y={60} width={200} height={110} rx={12} fill={body} />
        <Rect x={20} y={60} width={200} height={110} rx={12} fill="none" stroke={edge} strokeWidth={1.5} />
        <Path d="M20 170 L20 76 L120 132 L220 76 L220 170 Z" fill={body} stroke={edge} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
      <Animated.View
        style={[layer, { transform: [{ translateY: flap.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }, { scaleY: flap.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }) }] }]}
      >
        <Svg width={W} height={H} viewBox="0 -20 240 200">
          <Path d="M20 60 L120 125 L220 60 Z" fill={body} stroke={edge} strokeWidth={1.5} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
      {/* Sceau, anneau et onde, centrés sur la pointe du rabat */}
      <Animated.View
        style={{
          position: 'absolute', left: sealX - 40, top: sealY - 40, width: 80, height: 80, alignItems: 'center', justifyContent: 'center',
          opacity: Animated.multiply(drop, breathe),
          transform: [{ scale: drop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1.7, 0.92, 1] }) }],
        }}
      >
        <Svg width={80} height={80} viewBox="-40 -40 80 80">
          <Circle r={20} fill={w.accent} stroke={w.isNight ? 'none' : w.text} strokeWidth={w.isNight ? 0 : 2} />
          <Circle r={10} fill="none" stroke={w.onAccent} strokeWidth={2} opacity={0.55} />
          <AnimatedCircle r={27} fill="none" stroke={w.accentInk} strokeWidth={3} strokeLinecap="round" strokeDasharray="170,170" strokeDashoffset={ring as unknown as number} transform="rotate(-90)" />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: sealX - 20, top: sealY - 20, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: w.accentInk,
          opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
    </View>
  );
}

/** Textes du rituel (tutoiement). `date` : « 25 janvier 2027 ». */
export function sealTexts(phase: 'ready' | 'sealing' | 'waiting' | 'sealed', date: string): { title: string; body: string } {
  switch (phase) {
    case 'ready':
      return { title: 'Ta lettre est prête.', body: `Une fois scellée, personne ne pourra la lire avant le ${date}, pas même toi.` };
    case 'sealing':
      return { title: 'On la scelle…', body: 'Rien à faire, ça ne prend qu’un instant.' };
    case 'waiting':
      return { title: 'Encore un instant…', body: 'On finit de la mettre en sécurité.' };
    default:
      return { title: 'Lettre scellée.', body: `Elle te reviendra par courriel le ${date}.` };
  }
}

export function SealCaption({ phase, date }: { phase: 'ready' | 'sealing' | 'waiting' | 'sealed'; date: string }) {
  const t = sealTexts(phase, date);
  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
      <WText display size={25} lh={32} weight={600} tone="ink" center>{t.title}</WText>
      <WText size={16} lh={24} tone="soft" center>{t.body}</WText>
    </View>
  );
}
