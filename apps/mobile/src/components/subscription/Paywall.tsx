import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import {
  activeEntitlement,
  getCurrentOffering,
  purchase,
  restorePurchases,
  trialEligibleProductIds,
} from '../../services/purchases';
import { isoPeriodFr, perPeriodFr } from '../../services/subscription-logic';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { SubscriptionLoader } from './SubscriptionLoader';
import { C, LEGAL } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Paywall P3 — achat intégré UNIQUEMENT (App Store / Google Play).
// ANTI-STEERING : aucun texte, bouton ni lien ne renvoie vers un autre moyen de
// paiement. Prix, périodes et essais sont lus dans l'offering RevenueCat
// courant (jamais écrits en dur). Bouton « Restaurer les achats » obligatoire.
// ─────────────────────────────────────────────────────────────────────────────

const PROMISES = [
  'Une activité de 10 minutes par jour, rien à préparer',
  'Choisie pour votre enfant, et de mieux en mieux au fil de vos retours',
  'Adossée aux 13 séances de la Méthode THRIVE',
  'Le carnet des moments, pour garder ce que vous vivez ensemble',
];

/** Période d'essai gratuit d'un package, si le store en propose une. */
function freeTrialPeriod(pkg: PurchasesPackage): string | null {
  const p = pkg.product;
  if (Platform.OS === 'android') return p.defaultOption?.freePhase?.billingPeriod?.iso8601 ?? null;
  return p.introPrice && p.introPrice.price === 0 ? p.introPrice.period : null;
}

export function Paywall({ onSubscribed }: { onSubscribed?: () => void }) {
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
  }, [load]);

  // Annuel d'abord, puis mensuel, puis le reste.
  const packages = useMemo(() => {
    const order = ['$rc_annual', '$rc_monthly'];
    const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
    return [...(offering?.availablePackages ?? [])].sort((a, b) => rank(a.identifier) - rank(b.identifier));
  }, [offering]);

  const selected = packages.find((p) => p.identifier === selectedId) ?? packages[0] ?? null;
  const trial = selected && eligible.has(selected.product.identifier) ? freeTrialPeriod(selected) : null;

  const annualSaving = useMemo(() => {
    const m = offering?.monthly?.product.price;
    const a = offering?.annual?.product.price;
    if (!m || !a || m * 12 <= a) return null;
    return Math.round(((m * 12 - a) / (m * 12)) * 100);
  }, [offering]);

  const onBuy = async () => {
    if (!selected) return;
    setBusy('buy');
    const result = await purchase(selected);
    setBusy(null);
    if (result.status === 'success') {
      setCustomerInfo(result.customerInfo);
      if (activeEntitlement(result.customerInfo)) onSubscribed?.();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>MAISON · LE MOMENT QUI COMPTE</Text>
      <Text style={styles.title}>Ce n’est pas le nombre d’heures qui compte. C’est la qualité du moment.</Text>

      <View style={styles.card}>
        {PROMISES.map((p) => (
          <View key={p} style={styles.promise}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.promiseText}>{p}</Text>
          </View>
        ))}
      </View>

      {packages.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>L’abonnement n’est pas disponible pour le moment. Réessayez plus tard.</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={load}>
            <Text style={styles.secondaryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {packages.map((pkg) => {
              const isSel = pkg.identifier === selected?.identifier;
              const isAnnual = pkg.identifier === '$rc_annual';
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSel }}
                  onPress={() => setSelectedId(pkg.identifier)}
                  style={[styles.plan, isSel && styles.planSelected]}
                >
                  <View style={[styles.radio, isSel && styles.radioSelected]}>
                    {isSel && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.planName}>{isAnnual ? 'Annuel' : 'Mensuel'}</Text>
                      {isAnnual && annualSaving ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>−{annualSaving} %</Text>
                        </View>
                      ) : null}
                    </View>
                    {isAnnual && pkg.product.pricePerMonthString ? (
                      <Text style={styles.planSub}>soit {pkg.product.pricePerMonthString} par mois</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>{pkg.product.priceString}</Text>
                    <Text style={styles.planSub}>{perPeriodFr(pkg.product.subscriptionPeriod)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, busy !== null && styles.disabled]}
            onPress={onBuy}
            disabled={busy !== null}
            accessibilityRole="button"
          >
            {busy === 'buy' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {trial ? `Commencer mon essai de ${isoPeriodFr(trial)}` : 'M’abonner'}
              </Text>
            )}
          </TouchableOpacity>

          {selected && (
            <Text style={styles.fineprint}>
              {trial
                ? `Gratuit pendant ${isoPeriodFr(trial)}, puis ${selected.product.priceString} ${perPeriodFr(selected.product.subscriptionPeriod)}. `
                : `${selected.product.priceString} ${perPeriodFr(selected.product.subscriptionPeriod)}. `}
              {Platform.OS === 'ios'
                ? 'Le paiement est prélevé sur votre compte Apple à la confirmation de l’achat (à la fin de l’essai s’il y en a un). L’abonnement se renouvelle automatiquement, sauf annulation au moins 24 heures avant la fin de la période en cours. Gérez ou annulez-le dans les réglages de votre compte Apple.'
                : 'Le paiement est prélevé sur votre compte Google Play à la confirmation de l’achat (à la fin de l’essai s’il y en a un). L’abonnement se renouvelle automatiquement jusqu’à annulation. Gérez ou annulez-le dans Google Play › Paiements et abonnements.'}
            </Text>
          )}
        </>
      )}

      <TouchableOpacity
        style={[styles.secondaryBtn, busy !== null && styles.disabled]}
        onPress={onRestore}
        disabled={busy !== null}
        accessibilityRole="button"
      >
        {busy === 'restore' ? <ActivityIndicator color={C.accentText} /> : <Text style={styles.secondaryText}>Restaurer les achats</Text>}
      </TouchableOpacity>

      <View style={styles.legal}>
        <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)} accessibilityRole="link">
          Conditions d’utilisation
        </Text>
        {LEGAL.privacy ? (
          <>
            <Text style={styles.legalSep}>·</Text>
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)} accessibilityRole="link">
              Politique de confidentialité
            </Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 60, paddingBottom: 48, gap: 16 },
  eyebrow: { color: C.faint, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: C.text, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12 },
  promise: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  check: { color: C.accentText, fontSize: 15, fontWeight: '700', marginTop: 1 },
  promiseText: { color: C.body, fontSize: 15, lineHeight: 21, flex: 1 },
  body: { color: C.body, fontSize: 15, lineHeight: 21 },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border,
  },
  planSelected: { borderColor: C.accent, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  planName: { color: C.text, fontSize: 16, fontWeight: '700' },
  planSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  price: { color: C.text, fontSize: 18, fontWeight: '700' },
  badge: { backgroundColor: C.accentSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: C.accentText, fontSize: 11, fontWeight: '700' },
  primaryBtn: { backgroundColor: C.accent, borderRadius: 28, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { borderRadius: 24, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  secondaryText: { color: C.accentText, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  fineprint: { color: C.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  link: { color: C.muted, fontSize: 12, textDecorationLine: 'underline' },
  legalSep: { color: C.faint, fontSize: 12 },
});
