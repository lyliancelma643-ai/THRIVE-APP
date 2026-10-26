import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { AccentButton, WText, useWeb } from '../../design/web';
import { DUR, ease } from './anim';
import { Mascot } from './Mascot';
import { Rise } from './Rise';
import { ScaleBar } from './ScaleBar';

const K = 300 / 280; // viewBox 280×170 rendu en 300×182
const HEIGHTS = [30, 56, 82, 108];
const CX = [36, 98, 160, 222];
const CY = [106, 80, 54, 28];
const R = 14;
const px = (n: number) => n * K;

export type StairLoaderProps = {
  title: string;
  doneTitle: string;
  doneSubtitle?: string;
  stages: { key: string; label: string }[];
  index: number;
  total: number;
  done: boolean;
  slow?: boolean;
  canRetry?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  /** Bouton quand tout est prêt ; absent = session restaurée, on enchaîne tout seul (voir `onContinue`). */
  cta?: { label: string; onPress: () => void } | null;
  /** Mot doux ancré en bas (disparaît quand tout est prêt). */
  tip?: ReactNode;
};

/** L'escalier : 4 marches qui se remplissent sur des événements réels, la mascotte monte et plante le fanion. */
export function StairLoader({ title, doneTitle, doneSubtitle, stages, index, total, done, slow, canRetry, failed, onRetry, cta, tip }: StairLoaderProps) {
  const w = useWeb();
  const reduce = w.reduceMotion;
  const n = HEIGHTS.length;
  // Valeurs animées par marche : remplissage (scaleY) et respiration de l'active.
  const fills = useRef(HEIGHTS.map(() => new Animated.Value(0))).current;
  const ops = useRef(HEIGHTS.map(() => new Animated.Value(0))).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const mx = useRef(new Animated.Value(px(CX[0]))).current;
  const my = useRef(new Animated.Value(px(CY[0]))).current;
  const hop = useRef(new Animated.Value(0)).current;
  const cheer = useRef(new Animated.Value(0)).current;
  const flag = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);

  // Marches : remplies tant que i < index.
  useEffect(() => {
    fills.forEach((f, i) => {
      // Faite ou active : le remplissage est monté ; en attente : à plat, invisible.
      Animated.timing(f, { toValue: i <= index ? 1 : 0, duration: reduce ? DUR.fast : DUR.stairFill, easing: ease.out, useNativeDriver: true }).start();
      if (i < index) Animated.timing(ops[i], { toValue: 1, duration: 300, easing: ease.out, useNativeDriver: true }).start();
      else if (i === index) ops[i].setValue(0.5);
      else ops[i].setValue(0);
    });
  }, [index, fills, ops, reduce]);

  // Respiration de la marche active (opacité 0,3 ↔ 0,75, 1 600 ms).
  useEffect(() => {
    if (reduce || done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 800, easing: ease.inOut, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 800, easing: ease.inOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, done, breathe]);

  // Mascotte : vers la marche active (650 ms), saut de 550 ms à chaque changement, haptique légère.
  useEffect(() => {
    const target = Math.min(index, n - 1);
    Animated.parallel([
      Animated.timing(mx, { toValue: px(CX[target]), duration: reduce ? DUR.fast : 650, easing: ease.hop, useNativeDriver: true }),
      Animated.timing(my, { toValue: px(CY[target]), duration: reduce ? DUR.fast : 650, easing: ease.hop, useNativeDriver: true }),
    ]).start();
    if (index !== prev.current) {
      if (index > prev.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      prev.current = index;
      if (!reduce) {
        hop.setValue(0);
        Animated.timing(hop, { toValue: 1, duration: DUR.hop, easing: ease.out, useNativeDriver: true }).start();
      }
    }
  }, [index, n, mx, my, hop, reduce]);

  // Arrivée : fanion déployé et petit bond de joie.
  useEffect(() => {
    if (!done) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.timing(flag, { toValue: 1, duration: reduce ? DUR.fast : 500, easing: ease.spring, useNativeDriver: true }).start();
    if (!reduce) Animated.timing(cheer, { toValue: 1, duration: 700, easing: ease.spring, useNativeDriver: true }).start();
  }, [done, flag, cheer, reduce]);

  const label = done ? doneTitle : stages[Math.min(index, stages.length - 1)]?.label ?? '';
  const counter = done ? 'Terminé' : `Étape ${Math.min(index + 1, total)} sur ${total}`;
  const tint = w.accentInk;

  const hopY = hop.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -22, 0] });
  const hopSx = hop.interpolate({ inputRange: [0, 0.35, 0.72, 1], outputRange: [1, 0.96, 1.08, 1] });
  const hopSy = hop.interpolate({ inputRange: [0, 0.35, 0.72, 1], outputRange: [1, 1.06, 0.9, 1] });
  const cheerS = cheer.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.22, 1] });
  const cheerY = cheer.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -8, 0] });

  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 }}>
      <View style={{ width: 300, height: px(170) }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ position: 'absolute', left: 0, top: px(150), width: 300, height: 2, backgroundColor: w.line }} />
        {HEIGHTS.map((h, i) => {
          const active = i === index && !done;
          const opacity = active && !reduce ? breathe.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] }) : ops[i];
          return (
            <View key={i} style={{ position: 'absolute', left: px(8 + 62 * i), top: px(150 - h), width: px(56), height: px(h), borderRadius: px(8), backgroundColor: w.track, overflow: 'hidden' }}>
              <Animated.View
                style={{
                  position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: tint, opacity,
                  transform: [
                    { translateY: fills[i].interpolate({ inputRange: [0, 1], outputRange: [px(h) / 2, 0] }) },
                    { scaleY: fills[i].interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) },
                  ],
                }}
              />
            </View>
          );
        })}
        {/* Mât et fanion */}
        <View style={{ position: 'absolute', left: px(244), top: px(2), width: px(3), height: px(40), backgroundColor: w.text3, borderRadius: 1 }} />
        <Animated.View
          style={{
            position: 'absolute', left: px(247), top: px(2), width: px(30), height: px(20),
            transform: [{ translateX: flag.interpolate({ inputRange: [0, 1], outputRange: [-px(15), 0] }) }, { scaleX: flag.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) }],
          }}
        >
          <Svg width={px(30)} height={px(20)} viewBox="0 0 30 20">
            <Path d="M0 0 L30 10 L0 20 Z" fill={w.accent} stroke={w.isNight ? 'none' : w.text} strokeWidth={w.isNight ? 0 : 2} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
        {/* Mascotte */}
        <Animated.View
          style={{
            position: 'absolute', left: -px(R), top: -px(R), width: px(R * 2), height: px(R * 2),
            transform: [
              { translateX: mx },
              { translateY: Animated.add(my, Animated.add(hopY, cheerY)) },
              { scaleX: Animated.multiply(hopSx, cheerS) },
              { scaleY: Animated.multiply(hopSy, cheerS) },
            ],
          }}
        >
          <Mascot size={px(R * 2)} pose={done ? 'fiere' : 'marche'} />
        </Animated.View>
      </View>

      <WText size={22} lh={28} weight={700} tone="ink" center style={{ marginTop: 28 }}>
        {done ? doneTitle : title}
      </WText>
      <Rise key={label} distance={6} style={{ marginTop: 6, minHeight: 22 }}>
        <View accessibilityLiveRegion="polite">
          <WText size={17} lh={22} tone="soft" center>
            {done ? doneSubtitle ?? '' : label}
          </WText>
        </View>
      </Rise>
      <View style={{ marginTop: 18, alignItems: 'center', gap: 8 }}>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done ? total : index }}>
          <ScaleBar progress={Math.max(0.04, (done ? total : index) / total)} color={tint} />
        </View>
        <WText size={13} lh={18} tone="faint" style={{ fontVariant: ['tabular-nums'] }}>
          {counter}
        </WText>
      </View>

      {slow && !done ? (
        <Rise style={{ marginTop: 16 }}>
          <WText size={14} lh={20} tone="soft" center>
            Un peu plus long que d’habitude. Ton travail est sauvegardé.
          </WText>
        </Rise>
      ) : null}
      {(canRetry || failed) && !done && onRetry ? (
        <Rise style={{ marginTop: 12 }}>
          <AccentButton label="Réessayer" icon="refresh" height={48} onPress={onRetry} />
        </Rise>
      ) : null}
      {done && cta ? (
        <Rise style={{ marginTop: 24 }}>
          <AccentButton label={cta.label} height={52} onPress={cta.onPress} />
        </Rise>
      ) : null}
      {!done && tip ? <View style={{ marginTop: 24, alignSelf: 'stretch' }}>{tip}</View> : null}
    </View>
  );
}
