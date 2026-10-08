import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { supabaseClient as supabase } from '@thrive/shared';
import { useEntitlement } from '../../hooks/useEntitlement';
import { deletionSubscriptionWarning } from '../../services/subscription-logic';

// ─────────────────────────────────────────────────────────────────────────────
// « Supprimer mon compte » depuis l'app (App Store 5.1.1(v), Google Play :
// suppression de compte). Enregistre la demande (edge function
// request-account-deletion) ; l'équipe la traite avec admin-delete-user, qui
// arrête un abonnement web et efface l'abonné RevenueCat.
// Un abonnement App Store / Google Play n'est PAS annulé par la suppression :
// on le dit clairement AVANT la confirmation (sans lien vers un autre moyen de
// paiement — anti-steering).
// ─────────────────────────────────────────────────────────────────────────────

export function DeleteAccountRow() {
  const ent = useEntitlement();
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke('request-account-deletion', { body: {} });
      if (error) throw error;
      Alert.alert(
        'Demande enregistrée',
        'Votre demande de suppression est enregistrée. Votre compte et les données associées seront supprimés par notre équipe ; vous en serez informé par courriel.',
      );
    } catch {
      Alert.alert('Demande impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    const warning = ent.isSubscribed ? deletionSubscriptionWarning(ent.store, ent.willRenew, Platform.OS) : null;
    Alert.alert(
      'Supprimer mon compte',
      [
        'Votre compte, vos profils enfants et l’historique associé seront définitivement supprimés.',
        warning,
      ].filter(Boolean).join('\n\n'),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: send },
      ],
    );
  };

  return (
    <TouchableOpacity style={styles.row} onPress={confirm} disabled={busy} accessibilityRole="button">
      {busy ? <ActivityIndicator color="#f87171" /> : <Text style={styles.icon}>🗑️</Text>}
      <Text style={styles.text}>Supprimer mon compte</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  icon: { fontSize: 18, marginRight: 12 },
  text: { color: '#f87171', fontSize: 15, flex: 1 },
  chevron: { color: '#475569', fontSize: 18 },
});
