import { View } from 'react-native';
import { AccentButton, WIcon, WText, useWeb } from '../../design/web';

/** Chargement trop long ou raté : message simple et bouton « Réessayer » (jamais un squelette sans fin). */
export function LoadRetry({ onRetry, label = 'Le chargement prend plus de temps que prévu. Vérifie ta connexion, puis réessaie.' }: { onRetry: () => void; label?: string }) {
  const w = useWeb();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24, gap: 16 }} accessibilityRole="alert">
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(249,235,80,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <WIcon name="refresh" size={22} color={w.accentInk} />
      </View>
      <WText size={15} lh={1.5} tone="soft" center>
        {label}
      </WText>
      <AccentButton label="Réessayer" icon="refresh" height={48} onPress={onRetry} />
    </View>
  );
}
