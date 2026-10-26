import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useDelayedFlag } from '@thrive/shared';
import { Skeleton } from '../../design/web';

export type WaveShape = { height: number; radius?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> };

/** Colonne de formes de squelette, avec la vague (décalage de 80 ms par élément, plafonné à 8). */
export function WaveSkeleton({ shapes, gap = 12, label = 'Chargement' }: { shapes: WaveShape[]; gap?: number; label?: string }) {
  return (
    <View style={{ gap }} accessibilityLabel={label} accessibilityRole="progressbar">
      {shapes.map((s, i) => (
        <Skeleton key={i} index={i} height={s.height} radius={s.radius} style={[s.width ? { width: s.width } : null, s.style]} />
      ))}
    </View>
  );
}

/**
 * N'affiche le squelette qu'après 400 ms d'attente (puis au moins 300 ms) : une réponse rapide ne montre rien
 * qui clignote. Le contenu prend la place dès qu'il est là.
 */
export function WaveGate({ pending, skeleton, children }: { pending: boolean; skeleton: ReactNode; children: ReactNode }) {
  const shown = useDelayedFlag(pending);
  if (shown) return <>{skeleton}</>;
  return pending ? null : <>{children}</>;
}

/** Version « montage » : le squelette vit tant que le composant est monté ; masqué les 400 premières ms. */
export function DelayedSkeleton({ children }: { children: ReactNode }) {
  const shown = useDelayedFlag(true);
  return shown ? <>{children}</> : null;
}
