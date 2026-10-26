import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { DUR, ease } from './anim';
import { useWeb } from '../../design/web';

/**
 * Filet de 2 px sous l'en-tête pendant une revalidation d'une page DÉJÀ visitée (jamais à la première visite) :
 * balaye de gauche à droite (70 % de 700 ms), puis s'efface. `active` passe à vrai à chaque revalidation.
 */
export function HairlineRefresh({ active, width }: { active: boolean; width: number }) {
  const w = useWeb();
  const sweep = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    sweep.setValue(0);
    fade.setValue(1);
    Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: w.reduceMotion ? 0 : DUR.hair * 0.7, easing: ease.out, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: w.reduceMotion ? DUR.fast : DUR.hair * 0.3, easing: ease.out, useNativeDriver: true }),
    ]).start();
  }, [active, sweep, fade, w.reduceMotion]);
  return (
    <View pointerEvents="none" style={{ height: 2, width, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View
        style={{
          width, height: 2, backgroundColor: w.accentInk, opacity: fade,
          transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }) }, { scaleX: sweep.interpolate({ inputRange: [0, 1], outputRange: [0.0001, 1] }) }],
        }}
      />
    </View>
  );
}
