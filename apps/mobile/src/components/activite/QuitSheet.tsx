import { View } from 'react-native';
import { Button, Sheet, ThemedText } from '../../design';

/**
 * M17 · Quitter : « Enregistrer ce moment ? ». « Oui » compte les minutes jouées (on passe par « N minutes avec
 * {enfant}. » puis la synthèse) ; « Non » ne garde rien. Fermer la feuille sans répondre = on reste dans l'activité.
 */
export function QuitSheet({ visible, subtitle, onYes, onNo, onCancel }: { visible: boolean; subtitle: string; onYes: () => void; onNo: () => void; onCancel: () => void }) {
  return (
    <Sheet visible={visible} onClose={onCancel} title="Enregistrer ce moment ?" detent="medium" dim={0.5} closeLabel="Rester dans l’activité">
      <ThemedText variant="callout" color="label2" style={{ marginTop: 4 }}>{subtitle}</ThemedText>
      <View style={{ marginTop: 22, gap: 10 }}>
        <Button variant="accent" label="Oui" onPress={onYes} accessibilityLabel="Oui, enregistrer ce moment" />
        <Button variant="gray" label="Non" onPress={onNo} accessibilityLabel="Non, ne rien garder" />
      </View>
    </Sheet>
  );
}
