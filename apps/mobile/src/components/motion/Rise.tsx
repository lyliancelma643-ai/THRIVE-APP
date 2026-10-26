import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useWeb } from '../../design/web';
import { DUR, ease } from './anim';

/**
 * Arrivée du contenu (« rise ») : opacité 0→1 et 10 px→0 en 300 ms. `delay` en ms ; en « réduire les animations »,
 * simple fondu de 150 ms. `skip` = pas d'animation (page déjà visitée, valeurs inchangées).
 */
export function Rise({ delay = 0, distance = 10, skip, style, children }: { delay?: number; distance?: number; skip?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduceMotion } = useWeb();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) return;
    Animated.timing(v, {
      toValue: 1, duration: reduceMotion ? DUR.fast : DUR.slow, delay: reduceMotion ? 0 : delay, easing: ease.out, useNativeDriver: true,
    }).start();
  }, [v, delay, reduceMotion, skip]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: reduceMotion ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}
