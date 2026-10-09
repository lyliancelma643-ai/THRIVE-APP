import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useEntitlement } from '../../hooks/useEntitlement';
import { restorePurchases, showNativeSubscriptionManagement } from '../../services/purchases';
import { ENTITLEMENT_ID, formatDateFr, isNativeStoreManagementUrl } from '../../services/subscription-logic';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { C } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Section « ABONNEMENT » des paramètres.
//   • Payé via Apple / Google (sur CE téléphone) → « Gérer mon abonnement »
//     ouvre les réglages d'abonnement natifs.
//   • Payé ailleurs → message neutre, AUCUN bouton d'annulation ni lien sortant
//     (anti-steering App Store / Google Play).
//   • Accès offert → message neutre.
//   • Pas d'abonnement → accès au paywall intégré.
//   • « Restaurer les achats » toujours présent (exigence Apple).
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionSettings() {
  const ent = useEntitlement();
  const setCustomerInfo = useSubscriptionStore((s) => s.setCustomerInfo);
  const [restoring, setRestoring] = useState(false);

  if (ent.isStaff) return null;

  const end = formatDateFr(ent.expirationDate);

  const manage = async () => {
    try {
      await showNativeSubscriptionManagement();
    } catch {
      const info = useSubscriptionStore.getState().customerInfo;
      if (isNativeStoreManagementUrl(info?.managementURL, Platform.OS)) Linking.openURL(info!.managementURL!);
    }
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      const active = Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
      Alert.alert(
        active ? 'Achats restaurés' : 'Aucun achat trouvé',
        active
          ? 'Votre abonnement est actif.'
          : 'Aucun abonnement actif n’est associé à ce compte de store.',
      );
    } catch {
      Alert.alert('Restauration impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setRestoring(false);
    }
  };

  let status: string;
  if (ent.isLoading) status = 'Vérification…';
  else if (!ent.isSubscribed && ent.hasAccess) status = 'Inclus dans votre accompagnement THRIVE.';
  else if (!ent.isSubscribed) status = 'Aucun abonnement actif.';
  else if (ent.management === 'gift') status = end ? `Accès offert jusqu’au ${end}.` : 'Accès offert.';
  else if (ent.isTrial) status = end ? `Essai gratuit jusqu’au ${end}.` : 'Essai gratuit en cours.';
  else if (end) status = ent.willRenew ? `Actif · renouvellement le ${end}.` : `Actif jusqu’au ${end}, sans renouvellement.`;
  else status = 'Abonnement actif.';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ABONNEMENT</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Le moment qui compte</Text>
        <Text style={styles.value}>{status}</Text>
      </View>

      {ent.isSubscribed && ent.management === 'native' && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.action} onPress={manage} accessibilityRole="button">
            <Text style={styles.actionText}>Gérer mon abonnement</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </>
      )}

      {ent.isSubscribed && ent.management === 'external' && (
        <>
          <View style={styles.divider} />
          <Text style={styles.neutral}>Votre abonnement est actif sur ce compte.</Text>
        </>
      )}

      {!ent.isLoading && !ent.hasAccess && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity testID="subscription-discover" style={styles.action} onPress={() => router.push('/(parent)/abonnement')} accessibilityRole="button">
            <Text style={styles.actionText}>Découvrir l’abonnement</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.divider} />
      <TouchableOpacity testID="subscription-restore" style={styles.action} onPress={restore} disabled={restoring} accessibilityRole="button">
        {restoring ? <ActivityIndicator color={C.accentText} /> : <Text style={styles.actionText}>Restaurer les achats</Text>}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { color: C.faint, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  row: { paddingHorizontal: 16, paddingBottom: 14, gap: 4 },
  label: { color: C.muted, fontSize: 15 },
  value: { color: C.text, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  actionText: { color: C.accentText, fontSize: 15, fontWeight: '600' },
  chevron: { color: C.faint, fontSize: 20 },
  neutral: { color: C.body, fontSize: 14, paddingHorizontal: 16, paddingVertical: 14 },
});
