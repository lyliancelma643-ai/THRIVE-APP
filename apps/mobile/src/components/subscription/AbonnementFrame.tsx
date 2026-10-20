import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GlassButton, LargeTitle } from '../../design';
import { OffreScreen } from '../offres/parts';

/** Cadre de « Mon abonnement » (X2) : barre avec retour, grand titre, bandeau éventuel, puis le contenu. */
export function AbonnementFrame({ onBack, banner, children }: { onBack: () => void; banner?: ReactNode; children: ReactNode }) {
  return (
    <OffreScreen
      testID="abonnement"
      title="Mon abonnement"
      collapseTitle
      bottomSpace={40}
      left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={onBack} />}
    >
      <LargeTitle>Mon abonnement</LargeTitle>
      {banner ? <View style={{ marginHorizontal: 16, marginTop: 14 }}>{banner}</View> : null}
      <View style={{ marginTop: 14 }}>{children}</View>
    </OffreScreen>
  );
}
