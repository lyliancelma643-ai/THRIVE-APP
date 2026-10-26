import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { Display } from '../activite/parts';
import { useWeb } from '../../design/web';
import { OdometerNumber } from './OdometerNumber';

/**
 * Titre de la synthèse de fin : le compteur de moments défile de n−1 vers n (600 ms) puis « moments avec {prénom} ».
 * `animate={false}` (synthèse passée, retour sur l'écran) : valeurs finales, aucune animation.
 */
export function ClosingCount({ count, before, firstName, animate }: { count: number; before: number; firstName: string; animate: boolean }) {
  const label = count === 1 ? ' moment' : ' moments';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }} accessible accessibilityRole="header" accessibilityLabel={`${count}${label} avec ${firstName}`}>
      <OdometerNumber value={count} from={before} size={38} lh={44} animate={animate} display />
      <Display size={38} lineHeight={44} weight={600}>{`${label} avec ${firstName}`}</Display>
    </View>
  );
}

/** La phrase de fierté apparaît en fondu (300 ms) une fois le compteur posé. */
export function PrideFade({ animate, children }: { animate: boolean; children: ReactNode }) {
  const w = useWeb();
  const instant = !animate || w.reduceMotion;
  const v = useRef(new Animated.Value(instant ? 1 : 0)).current;
  useEffect(() => {
    if (instant) return;
    Animated.timing(v, { toValue: 1, duration: 300, delay: 700, useNativeDriver: true }).start();
  }, [v, instant]);
  return <Animated.View style={{ opacity: v }}>{children}</Animated.View>;
}
