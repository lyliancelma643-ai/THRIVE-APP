import { View } from 'react-native';
import { Button, Sheet, ThemedText } from '../../design';

/**
 * M17 · Quitter : « Enregistrer ce moment ? ». « Oui » compte les minutes jouées (on passe par « N minutes avec
 * {enfant}. » puis la synthèse) ; « Non » ne garde rien. Fermer la feuille sans répondre = on reste dans l'activité.
 * D3 : si une lettre a été scellée pendant ce moment, « Non » n'y change rien (le moment n'est pas compté, la lettre reste
 * scellée) ; on le dit sous le titre pour que personne ne croie la perdre.
 */
export const LETTER_STAYS_SEALED = 'Ta lettre reste scellée.';

export function QuitSheet({
  visible, subtitle, onYes, onNo, onCancel, letterSealed = false,
}: { visible: boolean; subtitle: string; onYes: () => void; onNo: () => void; onCancel: () => void; letterSealed?: boolean }) {
  return (
    <Sheet visible={visible} onClose={onCancel} title="Enregistrer ce moment ?" detent="medium" dim={0.5} closeLabel="Rester dans l’activité">
      {letterSealed ? <ThemedText variant="callout" weight={600} style={{ marginTop: 4 }}>{LETTER_STAYS_SEALED}</ThemedText> : null}
      <ThemedText variant="callout" color="label2" style={{ marginTop: letterSealed ? 6 : 4 }}>{subtitle}</ThemedText>
      <View style={{ marginTop: 22, gap: 10 }}>
        <Button variant="accent" label="Oui" onPress={onYes} accessibilityLabel="Oui, enregistrer ce moment" />
        <Button variant="gray" label="Non" onPress={onNo} accessibilityLabel="Non, ne rien garder" />
      </View>
    </Sheet>
  );
}

/**
 * Écriture qui n'a pas abouti (hors ligne, erreur serveur) : ton calme, deux choix, un seul bouton jaune. « Quitter sans
 * enregistrer » n'écrit rien. La feuille ne se ferme pas toute seule ; son bouton de fermeture est « Réessayer ».
 */
export function SaveFailedSheet({ visible, onRetry, onLeave }: { visible: boolean; onRetry: () => void; onLeave: () => void }) {
  return (
    <Sheet visible={visible} onClose={onRetry} title="Ce moment n’est pas encore gardé" detent="medium" dim={0.5} closeLabel="Réessayer">
      <ThemedText variant="callout" color="label2" style={{ marginTop: 4 }}>
        La connexion ne passe pas pour l’instant. Vous pouvez réessayer, ou partir sans l’enregistrer.
      </ThemedText>
      <View style={{ marginTop: 22, gap: 10 }}>
        <Button variant="accent" label="Réessayer" onPress={onRetry} />
        <Button variant="gray" label="Quitter sans enregistrer" onPress={onLeave} />
      </View>
    </Sheet>
  );
}
