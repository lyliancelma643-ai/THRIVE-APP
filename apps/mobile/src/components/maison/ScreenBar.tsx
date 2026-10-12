import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, SPACING } from '../../design';

type Props = { onBack: () => void; right?: ReactNode; backLabel?: string };

/** Barre du haut posée sur le contenu : retour en verre à gauche, actions à droite. */
export function ScreenBar({ onBack, right, backLabel = 'Retour' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingTop: insets.top + SPACING.space1, paddingHorizontal: SPACING.space4,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <GlassButton icon="chevron-back" accessibilityLabel={backLabel} onPress={onBack} />
      <View style={{ flexDirection: 'row', gap: SPACING.space2 }}>{right}</View>
    </View>
  );
}
