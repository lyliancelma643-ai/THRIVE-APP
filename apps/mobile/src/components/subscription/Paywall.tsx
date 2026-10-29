import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const confirmAccess = useSubscriptionStore((s) => s.confirmAccessAfterPurchase);
  const inFlight = useRef(false); // double appui : un seul achat / restauration à la fois
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
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setBusy('buy');
    try {
      const result = await purchase(selected);
      if (result.status === 'success') {
        const open = await confirmAccess(result.customerInfo);
        if (open) onSubscribed?.();
        else if (activeEntitlement(result.customerInfo)) {
          Alert.alert('Achat enregistré', 'Votre achat est bien reçu ; l’accès s’ouvrira dans quelques instants. Sinon, touchez « Restaurer ».');
        } else {
          // Achat Apple réussi mais droit pas encore visible (Ask to Buy / synchronisation) : pas d'erreur.
          Alert.alert('Achat en cours de traitement', 'L’accès s’ouvrira automatiquement dès la confirmation.');
        }
      } else if (result.status === 'pending') {
        Alert.alert('Paiement en attente', 'Votre paiement attend une approbation (par exemple « Autoriser l’achat »). L’accès s’ouvrira automatiquement dès sa confirmation.');
      } else if (result.status === 'error') {
        Alert.alert('Achat impossible', result.message);
      }
      // 'cancelled' : l'utilisateur a fermé la feuille Apple, aucun message.
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy('restore');
    try {
      const info = await restorePurchases();
      if (activeEntitlement(info)) {
        await confirmAccess(info);
        Alert.alert('Achats restaurés', 'Votre abonnement est actif.');
        onSubscribed?.();
      } else {
        useSubscriptionStore.getState().setCustomerInfo(info);
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif n’est associé à ce compte de store.');
      }
    } catch {
      Alert.alert('Restauration impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      inFlight.current = false;
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
