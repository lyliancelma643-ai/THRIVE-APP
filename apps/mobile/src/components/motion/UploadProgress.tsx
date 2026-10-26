import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { THRESH } from '@thrive/shared';
import { WIcon, WText, useWeb } from '../../design/web';
import { ease } from './anim';
import { Pop } from './Pop';
import { ScaleBar } from './ScaleBar';

export type UploadProgressProps = {
  /** Aperçu de la photo (URI locale). */
  uri: string | null;
  /** Progression RÉELLE d'envoi (0..1) ; `null` si l'envoi ne la fournit pas : barre indéterminée, aucun chiffre. */
  progress: number | null;
  done: boolean;
  childName?: string | null;
  onCancel?: () => void;
};

/** La photo « se développe » à mesure de l'envoi. Jamais de pourcentage inventé. */
export function UploadProgress({ uri, progress, done, childName, onCancel }: UploadProgressProps) {
  const w = useWeb();
  const p = done ? 1 : progress ?? 0;
  const v = useRef(new Animated.Value(p)).current;
  const [long, setLong] = useState(false);
  useEffect(() => {
    if (progress === null && !done) return;
    Animated.timing(v, { toValue: p, duration: w.reduceMotion ? 150 : 400, easing: ease.out, useNativeDriver: true }).start();
  }, [p, progress, done, v, w.reduceMotion]);
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setLong(true), THRESH.slowMessage);
    return () => clearTimeout(id);
  }, [done]);
  const pct = Math.round(p * 100);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ height: 180, borderRadius: 18, overflow: 'hidden', backgroundColor: w.surface }}>
        {uri ? (
          <Animated.View style={{ flex: 1, transform: [{ scale: w.reduceMotion ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1] }) }] }}>
            <Image source={{ uri }} style={{ flex: 1 }} resizeMode="cover" accessibilityIgnoresInvertColors />
          </Animated.View>
        ) : null}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: w.surface, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }} />
      </View>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <WText size={17} lh={22} weight={600} tone="ink">
          {done ? 'Photo enregistrée' : progress === null ? 'Envoi de la photo…' : 'Envoi de la photo'}
        </WText>
        {progress !== null || done ? (
          <WText size={22} lh={28} weight={700} tone="ink" style={{ fontVariant: ['tabular-nums'] }}>{`${pct} %`}</WText>
        ) : null}
      </View>
      <ScaleBar progress={done ? 1 : progress} width={280} />
      {long && !done ? (
        <WText size={14} lh={20} tone="soft">
          Un peu long. L’envoi continue, tu peux passer à la suite.
        </WText>
      ) : null}
      {done ? (
        <Pop>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 36, borderRadius: 18, backgroundColor: w.chip }}>
            <WIcon name="check" size={16} color={w.sageInk} strokeWidth={2.6} />
            <WText size={14} weight={600} tone="ink">
              {childName ? `Gardée dans le carnet de ${childName}` : 'Gardée dans le carnet'}
            </WText>
          </View>
        </Pop>
      ) : onCancel ? (
        <Pressable onPress={onCancel} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <WText size={14} weight={600} tone="soft">Annuler l’envoi</WText>
        </Pressable>
      ) : null}
    </View>
  );
}
