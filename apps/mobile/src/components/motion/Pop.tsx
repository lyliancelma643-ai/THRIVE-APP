import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { useWeb } from '../../design/web';
import { ease } from './anim';

/** « pop » : l'élément passe de 0,8 à 1 en ressort (400 ms par défaut). `skip` = déjà en place, aucune animation. */
export function Pop({ ms = 400, skip, children }: { ms?: number; skip?: boolean; children: ReactNode }) {
  const { reduceMotion } = useWeb();
  const instant = skip || reduceMotion;
  const v = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (instant) return;
    Animated.timing(v, { toValue: 1, duration: ms, easing: ease.spring, useNativeDriver: true }).start();
  }, [v, ms, instant]);
  return (
    <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}
