import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { GlassButton, ListGroup, ListRow, Pill, SPACING, ThemedText, VignetteImage, useTheme } from '../../design';
import { useEntitlement } from '../../hooks/useEntitlement';
import { restorePurchases, showNativeSubscriptionManagement } from '../../services/purchases';
import { ENTITLEMENT_ID, formatDateFr, isNativeStoreManagementUrl } from '../../services/subscription-logic';
import { useSubscriptionStore } from '../../stores/subscription.store';

// ─────────────────────────────────────────────────────────────────────────────
// X2 — Mon abonnement (Maison).
//   • Payé via Apple / Google (sur CE téléphone) → « Gérer dans l’App Store » ouvre
//     les réglages natifs ; « Restaurer les achats » n'apparaît que dans ce cas.
//   • Payé ailleurs → message neutre, AUCUN bouton d'annulation ni lien sortant
//     (anti-steering App Store / Google Play).
//   • Accès offert → message neutre.
//   • Accès venu d'un pack programme → ligne « Programme réglé par Stripe · aucun
//     abonnement séparé » (seule mention autorisée ; rien sinon).
//   • Pas d'abonnement → accès au paywall intégré.
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionSettings({ embedded = false }: { embedded?: boolean }) {
  const { colors } = useTheme();
  const ent = useEntitlement();
  const setCustomerInfo = useSubscriptionStore((s) => s.setCustomerInfo);
  const access = useSubscriptionStore((s) => s.access);
  const [restoring, setRestoring] = useState(false);

  if (ent.isStaff) return null;

  const end = formatDateFr(ent.expirationDate);
  const packEnd = formatDateFr(access?.packEnd);
  const fromProgram = access?.sourceMaison === 'pack';
  const storeName = Platform.OS === 'android' ? 'Google Play' : 'l’App Store';
  const native = ent.isSubscribed && ent.management === 'native';

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
        active ? 'Votre abonnement est actif.' : 'Aucun abonnement actif n’est associé à ce compte de store.',
      );
    } catch {
      Alert.alert('Restauration impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setRestoring(false);
    }
  };

  let status: string;
  let pill: string | null = null;
  if (ent.isLoading) status = 'Vérification…';
  else if (fromProgram && !ent.isSubscribed) {
    status = 'Inclus avec ton programme';
    pill = 'Actif';
  } else if (!ent.isSubscribed && ent.hasAccess) status = 'Inclus dans ton accompagnement THRIVE.';
  else if (!ent.isSubscribed) status = 'Aucun abonnement actif.';
  else if (ent.management === 'gift') {
    status = end ? `Accès offert jusqu’au ${end}.` : 'Accès offert.';
    pill = 'Actif';
  } else if (ent.isTrial) {
    status = end ? `Essai gratuit jusqu’au ${end}.` : 'Essai gratuit en cours.';
    pill = 'Essai gratuit';
  } else if (end) {
    status = ent.willRenew ? `Actif · renouvellement le ${end}.` : `Actif jusqu’au ${end}, sans renouvellement.`;
    pill = 'Actif';
  } else {
    status = 'Abonnement actif.';
    pill = 'Actif';
  }

  return (
    <View style={{ gap: SPACING.space4, marginHorizontal: SPACING.space4, marginBottom: SPACING.space4 }}>
      {embedded ? <ThemedText variant="title3" accessibilityRole="header">Abonnement</ThemedText> : null}

      <View
        style={{
          backgroundColor: colors.bgGrouped2, borderRadius: 26, padding: SPACING.space4, gap: SPACING.space3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
          <VignetteImage id="ACT-0603" style={{ width: 56, height: 56, borderRadius: 16 }} accessibilityLabel="" />
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline">THRIVE Maison</ThemedText>
            <ThemedText variant="subheadline" color="label2">{status}</ThemedText>
          </View>
          {pill ? <Pill label={pill} tone={ent.isTrial ? 'tint' : 'ok'} /> : null}
        </View>
        {fromProgram && packEnd ? (
          <ThemedText variant="footnote" color="label2">{`Accès ouvert jusqu’au ${packEnd}.`}</ThemedText>
        ) : null}
        {ent.isSubscribed && ent.isTrial && end ? (
          <ThemedText variant="footnote" color="label2">
            Annule au moins 24 h avant la fin de l’essai pour ne rien payer.
          </ThemedText>
        ) : null}
      </View>

      {ent.isSubscribed || fromProgram ? (
        <ListGroup>
          <ListRow
            icon="people"
            iconColor="sysIndigo"
            title="Partagé avec ton co-parent"
            subtitle="Un seul accès pour la famille"
            last={!native && !fromProgram}
          />
          {native ? (
            <ListRow
              icon="phone-portrait"
              iconColor="label"
              title={`Payé via ${storeName}`}
              subtitle="Sur ce téléphone"
              last
            />
          ) : null}
          {fromProgram && !native ? (
            <ListRow
              icon="card"
              iconColor="sysIndigo"
              title="Payé avec ton programme"
              subtitle="Programme réglé par Stripe · aucun abonnement séparé"
              last
            />
          ) : null}
        </ListGroup>
      ) : null}

      {ent.isSubscribed && ent.management === 'external' ? (
        <ThemedText variant="subheadline" color="label2">Ton abonnement est actif sur ce compte.</ThemedText>
      ) : null}

      {native ? (
        <ListGroup>
          <ListRow
            icon="settings"
            iconColor="fill"
            title={`Gérer dans ${storeName}`}
            subtitle="Changer de formule ou annuler"
            onPress={manage}
          />
          <ListRow
            icon="refresh"
            iconColor="fill"
            title="Restaurer les achats"
            accessory={restoring ? <ActivityIndicator color={colors.tint} /> : undefined}
            chevron={false}
            onPress={restoring ? undefined : restore}
            last
          />
        </ListGroup>
      ) : null}

      {!ent.isLoading && !ent.hasAccess ? (
        <View style={{ alignItems: 'flex-start' }}>
          <GlassButton
            label="Découvrir l’abonnement"
            onPress={() => router.push('/(parent)/abonnement')}
          />
        </View>
      ) : null}

      <ThemedText variant="footnote" color="label2">
        Déjà abonné ailleurs ? Connecte-toi avec la même adresse : ton accès est reconnu partout.
      </ThemedText>
    </View>
  );
}
