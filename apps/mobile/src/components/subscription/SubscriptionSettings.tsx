import React, { useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useMaisonOffering } from '../offres/useMaisonOffering';
import { useCurrentPack } from '../offres/useCurrentPack';
import { programByPack } from '../offres/pricing';
import { activeEntitlement, restorePurchases, showNativeSubscriptionManagement } from '../../services/purchases';
import { ENTITLEMENT_ID, formatDateFr, isNativeStoreManagementUrl, perPeriodFr } from '../../services/subscription-logic';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { SubscriptionView } from './SubscriptionView';
import { buildSubscriptionModel, trialProgress } from './subscriptionModel';

// ─────────────────────────────────────────────────────────────────────────────
// X2 — Mon abonnement (Maison). Conteneur : lit l'accès RÉEL et délègue l'affichage à SubscriptionView.
//   • Payé via Apple / Google (sur CE téléphone) → « Gérer dans l’App Store » ouvre
//     les réglages du système ; « Restaurer les achats » n'apparaît que dans ce cas.
//   • Payé ailleurs → message neutre, AUCUN bouton d'annulation ni lien sortant
//     (anti-steering App Store / Google Play).
//   • Accès offert → message neutre.
//   • Accès venu d'un pack programme → ligne « Programme réglé par Stripe · aucun
//     abonnement séparé » (seule mention autorisée ; rien sinon).
//   • Pas d'abonnement → accès au paywall intégré.
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionSettings({ embedded = false }: { embedded?: boolean }) {
  const ent = useEntitlement();
  const setCustomerInfo = useSubscriptionStore((s) => s.setCustomerInfo);
  const customerInfo = useSubscriptionStore((s) => s.customerInfo);
  const access = useSubscriptionStore((s) => s.access);
  const { monthly, annual } = useMaisonOffering();
  const currentPack = useCurrentPack();
  const [restoring, setRestoring] = useState(false);

  if (ent.isStaff) return null;

  const android = Platform.OS === 'android';
  const storeName = android ? 'Google Play' : 'l’App Store';
  const fromProgram = access?.sourceMaison === 'pack';

  const manage = async () => {
    try {
      await showNativeSubscriptionManagement();
    } catch {
      const info = useSubscriptionStore.getState().customerInfo;
      if (isNativeStoreManagementUrl(info?.managementURL, Platform.OS)) Linking.openURL(info!.managementURL!);
    }
  };

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const active = Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
      if (active) await useSubscriptionStore.getState().confirmAccessAfterPurchase(info);
      else setCustomerInfo(info);
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

  // Formule de l'abonnement actif : retrouvée dans l'offering par identifiant de produit (jamais de prix en dur).
  const entitlement = activeEntitlement(customerInfo);
  const pkg = [annual, monthly].find((p) => p && p.product.identifier === entitlement?.productIdentifier) ?? null;
  const planUnit = pkg ? perPeriodFr(pkg.product.subscriptionPeriod).replace('/ ', 'par ') : '';
  const model = buildSubscriptionModel({
    isLoading: ent.isLoading,
    hasAccess: ent.hasAccess,
    isSubscribed: ent.isSubscribed,
    isTrial: ent.isTrial,
    willRenew: ent.willRenew,
    management: ent.management,
    fromProgram,
    programName: programByPack(currentPack)?.name ?? null,
    endDate: formatDateFr(ent.expirationDate),
    packEnd: formatDateFr(access?.packEnd),
    planLine: pkg ? `${pkg === annual ? 'Annuel' : 'Mensuel'} · ${pkg.product.priceString} ${planUnit}` : null,
    planPrice: pkg ? `${pkg.product.priceString} ${planUnit}` : null,
    offer: { monthly: monthly?.product.priceString ?? null, annual: annual?.product.priceString ?? null },
    trialProgress: ent.isTrial ? trialProgress(entitlement?.latestPurchaseDate, entitlement?.expirationDate) : null,
    storeName,
  });

  return (
    <SubscriptionView
      model={model}
      storeName={storeName}
      deviceLabel={android ? 'Sur ce téléphone' : 'Sur cet iPhone'}
      embedded={embedded}
      restoring={restoring}
      onManage={manage}
      onRestore={restore}
      onDiscover={() => router.push('/(parent)/abonnement')}
    />
  );
}
