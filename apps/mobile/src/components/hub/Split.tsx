import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useLayout } from '../../design/layout';

/**
 * Deux colonnes côte à côte sur iPad (≥ 800 pt : 11″ et 13″, portrait comme paysage) ; empilées sur iPhone.
 * `ratio` = poids des deux colonnes ; `stickyLeft` n'est pas géré (le défilement reste celui de la page).
 */
export function Split({
  left, right, ratio = [5, 6], gap = 40,
}: { left: ReactNode; right: ReactNode; ratio?: [number, number]; gap?: number }) {
  const { wide } = useLayout();
  if (!wide) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
      <View style={{ flex: ratio[0], minWidth: 0 }}>{left}</View>
      <View style={{ flex: ratio[1], minWidth: 0 }}>{right}</View>
    </View>
  );
}
