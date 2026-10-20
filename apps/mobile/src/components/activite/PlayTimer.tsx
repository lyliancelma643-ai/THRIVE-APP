import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText, useTheme } from '../../design';
import type { StepTimer, TimerTone } from '../../lib/p3';
import { stepTimerAt } from './flow';
import { Display } from './parts';

/**
 * Les sept tons du minuteur de jeu, en couleurs de la charte (marine, sauge, crème, jaune soleil). La couleur n'est pas
 * le seul signal : le ballon grandit, se fige, se vide ; le mot s'affiche en très grand. Contraste ≥ 4,5:1 (texte posé).
 */
export const TONE_BG: Record<TimerTone, string> = {
  action: '#F9EB50',
  tension: '#004063',
  detente: '#C9DCD6',
  inspire: '#A7C4BC',
  garde: '#F7F5F2',
  expire: '#3380AC',
  silence: '#022539',
};
const TONE_FG: Record<TimerTone, string> = {
  action: '#022539',
  tension: '#F7F5F2',
  detente: '#022539',
  inspire: '#022539',
  garde: '#022539',
  expire: '#FFFFFF',
  silence: '#F7F5F2',
};
const ORB: Partial<Record<TimerTone, [number, number]>> = { inspire: [0.55, 1], garde: [1, 1], expire: [1, 0.55] };

/** Ballon qui accompagne l'inspiration (grandit), la rétention (fixe) et l'expiration (se vide). Sans animation si « Réduire les animations ». */
function Orb({ from, to, seconds, color, phaseKey }: { from: number; to: number; seconds: number; color: string; phaseKey: number }) {
  const { reduceMotion } = useTheme();
  const scale = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    scale.setValue(from);
    if (reduceMotion) {
      scale.setValue(to);
      return;
    }
    const a = Animated.timing(scale, { toValue: to, duration: seconds * 1000, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [phaseKey, from, to, seconds, reduceMotion, scale]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: color, opacity: 0.18, transform: [{ scale }] }}
    />
  );
}

/**
 * M4 · Minuteur de jeu en plein écran. Le parent le lance UNE fois ; l'écran enchaîne seul phases et tours.
 * « Prêt ? 3, 2, 1 » d'abord. Un léger retour haptique aux changements de phase (expo-haptics, déjà installé) remplace
 * le bip du web : `expo-av`/`expo-audio` n'est pas installé et aucune dépendance n'est ajoutée.
 */
export function PlayTimer({ timer, onClose }: { timer: StepTimer; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [haptics, setHaptics] = useState(true);
  const lastPhase = useRef(-2);
  const t = (now - startedAt) / 1000;
  const pos = stepTimerAt(timer, t);

  useEffect(() => {
    if (pos.finished) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [pos.finished]);

  useEffect(() => {
    if (pos.globalPhase === lastPhase.current) return;
    lastPhase.current = pos.globalPhase;
    if (!haptics || pos.globalPhase === -1) return;
    void Haptics.notificationAsync(pos.globalPhase === 999 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [pos.globalPhase, haptics]);

  // Fermeture douce peu après la fin : on revient au déroulé.
  useEffect(() => {
    if (!pos.finished) return;
    const id = setTimeout(onClose, 2600);
    return () => clearTimeout(id);
  }, [pos.finished, onClose]);

  const phase = timer.phases[pos.phaseIndex];
  const calm = pos.lead || pos.finished;
  const bg = pos.lead ? colors.navy900 : pos.finished ? colors.navy600 : TONE_BG[phase.tone];
  const fg = calm ? colors.cream : TONE_FG[phase.tone];
  const orb = !calm ? ORB[phase.tone] : undefined;
  const restart = () => {
    lastPhase.current = -2;
    const s = Date.now();
    setStartedAt(s);
    setNow(s);
  };
  const soft = `${fg}24`;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }} accessibilityRole="timer" accessibilityLiveRegion="assertive">
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, height: insets.top + 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => setHaptics((h) => !h)}
            accessibilityRole="switch"
            accessibilityState={{ checked: haptics }}
            accessibilityLabel={haptics ? 'Vibration : oui' : 'Vibration : non'}
            style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: soft, justifyContent: 'center' }}
          >
            <ThemedText variant="callout" weight={600} style={{ color: fg }}>{haptics ? 'Vibration : oui' : 'Vibration : non'}</ThemedText>
          </Pressable>
          {!calm && timer.rounds > 1 ? (
            <ThemedText variant="headline" style={{ color: fg, fontVariant: ['tabular-nums'] }}>{`Tour ${pos.round + 1} / ${timer.rounds}`}</ThemedText>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          {orb ? <Orb from={orb[0]} to={orb[1]} seconds={phase.seconds} color={fg} phaseKey={pos.globalPhase} /> : null}
          {pos.lead ? (
            <>
              <ThemedText variant="title2" weight={600} style={{ color: fg, opacity: 0.9 }}>Prêt ?</ThemedText>
              <Display size={120} lineHeight={124} weight={600} style={{ color: fg, marginTop: 8 }}>{String(pos.leadLeft)}</Display>
              <ThemedText variant="title3" style={{ color: fg, marginTop: 24, opacity: 0.9, textAlign: 'center' }}>{`D’abord : ${timer.phases[0].label}`}</ThemedText>
            </>
          ) : pos.finished ? (
            <Display size={56} lineHeight={62} weight={600} style={{ color: fg }}>Terminé !</Display>
          ) : (
            <>
              <Display size={40} lineHeight={44} weight={600} align="center" style={{ color: fg, textTransform: 'uppercase' }}>{phase.label}</Display>
              <Display size={110} lineHeight={116} weight={600} style={{ color: fg, marginTop: 28, fontVariant: ['tabular-nums'] }}>{String(pos.left)}</Display>
            </>
          )}
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, 20) + 16, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
          {pos.finished ? (
            <>
              <Pressable onPress={restart} accessibilityRole="button" style={{ height: 56, paddingHorizontal: 32, borderRadius: 28, backgroundColor: colors.cream, justifyContent: 'center' }}>
                <ThemedText variant="headline" weight={700} style={{ color: colors.navy900 }}>Relancer</ThemedText>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button" style={{ height: 56, paddingHorizontal: 32, borderRadius: 28, backgroundColor: soft, justifyContent: 'center' }}>
                <ThemedText variant="headline" weight={700} style={{ color: fg }}>Fermer</ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={onClose} accessibilityRole="button" style={{ height: 58, paddingHorizontal: 44, borderRadius: 29, backgroundColor: soft, justifyContent: 'center' }}>
              <ThemedText variant="headline" weight={700} style={{ color: fg }}>Arrêter</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
