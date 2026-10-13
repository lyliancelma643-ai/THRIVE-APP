import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  activeEntitlement,
  getCurrentOffering,
  purchase,
  restorePurchases,
  trialEligibleProductIds,
} from '../../services/purchases';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { freeTrialPeriod } from '../offres/useMaisonOffering';
import { SubscriptionLoader } from './SubscriptionLoader';
import { LEGAL } from './theme';
import { PaywallView } from './PaywallView';
import { buildPaywallContent } from './paywallModel';

// ─────────────────────────────────────────────────────────────────────────────
// Paywall D2 — achat intégré UNIQUEMENT (App Store / Google Play).
// ANTI-STEERING : aucun texte, bouton ni lien ne renvoie vers un autre moyen de
// paiement. Prix, périodes et essais sont lus dans l'offering RevenueCat
// courant (jamais écrits en dur). Bouton « Restaurer les achats » obligatoire.
// Hiérarchie (Apple 3.1.2) : le mois gratuit d'abord, le prix facturé jamais caché.
// ─────────────────────────────────────────────────────────────────────────────

export function Paywall({ onSubscribed, onClose }: { onSubscribed?: () => void; onClose?: () => void }) {
  const setCustomerInfo = useSubscriptionStore((s) => s.setCustomerInfo);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eligible, setEligible] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await getCurrentOffering();
      setOffering(current);
      const pkgs = current?.availablePackages ?? [];
      setSelectedId((current?.annual ?? pkgs[0])?.identifier ?? null);
      setEligible(await trialEligibleProductIds(pkgs.map((p) => p.product.identifier)));
    } catch {
      setOffering(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!LEGAL.complete) {
      console.warn('[Paywall] EXPO_PUBLIC_PRIVACY_URL / EXPO_PUBLIC_TERMS_URL manquants : vente désactivée.');
    }
  }, [load]);

  // Annuel d'abord, puis mensuel, puis le reste.
  const packages = useMemo(() => {
    const order = ['$rc_annual', '$rc_monthly'];
    const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
    return [...(offering?.availablePackages ?? [])].sort((a, b) => rank(a.identifier) - rank(b.identifier));
  }, [offering]);

  const selected = packages.find((p) => p.identifier === selectedId) ?? packages[0] ?? null;
  const trial = selected && eligible.has(selected.product.identifier) ? freeTrialPeriod(selected) : null;

  const onBuy = async () => {
    if (!selected) return;
    setBusy('buy');
    const result = await purchase(selected);
    setBusy(null);
    if (result.status === 'success') {
      setCustomerInfo(result.customerInfo);
      if (activeEntitlement(result.customerInfo)) onSubscribed?.();
      else Alert.alert('Achat enregistré', 'Votre achat est bien reçu ; l’accès s’ouvrira dans quelques instants. Sinon, touchez « Restaurer les achats ».');
    } else if (result.status === 'pending') {
      Alert.alert('Paiement en attente', 'Votre paiement est en cours de validation. L’accès s’ouvrira dès sa confirmation.');
    } else if (result.status === 'error') {
      Alert.alert('Achat impossible', result.message);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      if (activeEntitlement(info)) {
        Alert.alert('Achats restaurés', 'Votre abonnement est actif.');
        onSubscribed?.();
      } else {
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif n’est associé à ce compte de store.');
      }
    } catch {
      Alert.alert('Restauration impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <SubscriptionLoader />;

  const canSell = packages.length > 0 && LEGAL.complete;
  const content = buildPaywallContent({
    packages,
    selectedId,
    trialIso: trial,
    monthlyPrice: offering?.monthly?.product.price,
    annualPrice: offering?.annual?.product.price,
    now: new Date(),
    android: Platform.OS === 'android',
  });

  return (
    <PaywallView
      {...content}
      onSelect={setSelectedId}
      canSell={canSell}
      busy={busy}
      terms={LEGAL.terms ? { onPress: () => WebBrowser.openBrowserAsync(LEGAL.terms) } : undefined}
      privacy={LEGAL.privacy ? { onPress: () => WebBrowser.openBrowserAsync(LEGAL.privacy) } : undefined}
      onBuy={onBuy}
      onRestore={onRestore}
      onRetry={load}
      onClose={onClose}
    />
  );
}
