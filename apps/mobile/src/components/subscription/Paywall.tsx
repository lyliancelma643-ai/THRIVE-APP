import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  activeEntitlement,
  getCurrentOffering,
  purchase,
  restorePurchases,
  trialEligibleProductIds,
} from '../../services/purchases';
import {
  annualSavingPercent,
  formatDayMonthFr,
  formatMoneyFr,
  isoPeriodFr,
  perMonthFromAnnual,
  perPeriodFr,
  trialTimeline,
} from '../../services/subscription-logic';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { GlassButton, GlassSurface, MascotHero, RADIUS, SPACING, ThemedText, useTheme } from '../../design';
import { freeTrialPeriod } from '../offres/useMaisonOffering';
import { SubscriptionLoader } from './SubscriptionLoader';
import { LEGAL } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Paywall D2 — achat intégré UNIQUEMENT (App Store / Google Play).
// ANTI-STEERING : aucun texte, bouton ni lien ne renvoie vers un autre moyen de
// paiement. Prix, périodes et essais sont lus dans l'offering RevenueCat
// courant (jamais écrits en dur). Bouton « Restaurer les achats » obligatoire.
// Hiérarchie (Apple 3.1.2) : le mois gratuit d'abord, le prix facturé jamais caché.
// ─────────────────────────────────────────────────────────────────────────────

/** Nom de l'abonnement, identique à celui des fiches App Store / Google Play. */
const SUBSCRIPTION_NAME = 'THRIVE — Le moment qui compte';

const PROMISES = [
  'Une activité de 10 minutes par jour, rien à préparer',
  'Choisie pour votre enfant, et de mieux en mieux au fil de vos retours',
  'Adossée aux 13 séances de la Méthode THRIVE',
  'Le carnet des moments, pour garder ce que vous vivez ensemble',
];

export function Paywall({ onSubscribed, onClose }: { onSubscribed?: () => void; onClose?: () => void }) {
  const { colors, fontsLoaded } = useTheme();
  const insets = useSafeAreaInsets();
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

  const annualSaving = useMemo(
    () => annualSavingPercent(offering?.monthly?.product.price, offering?.annual?.product.price),
    [offering],
  );
  // Frise : calculée depuis la période d'essai de l'offering, jamais écrite en dur.
  const timeline = useMemo(() => (trial ? trialTimeline(new Date(), trial) : null), [trial]);

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
  const serif = fontsLoaded ? 'Fraunces_400Regular' : Platform.select({ ios: 'Times New Roman', default: 'serif' });
  const trialLabel = trial ? isoPeriodFr(trial) : null;
  const period = selected ? perPeriodFr(selected.product.subscriptionPeriod) : '';
  const firstPaymentDay = timeline ? formatDayMonthFr(timeline.firstPayment) : null;

  const steps = timeline
    ? [
        { icon: 'gift-outline' as const, day: 'Aujourd’hui', note: '0 $', on: true },
        { icon: 'notifications-outline' as const, day: formatDayMonthFr(timeline.notice), note: 'On te prévient', on: false },
        { icon: 'star-outline' as const, day: formatDayMonthFr(timeline.firstPayment), note: '1er paiement', on: false },
      ]
    : [];

  return (
    <View testID="paywall" style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACING.space2,
          paddingHorizontal: SPACING.space4,
          paddingBottom: SPACING.space8 * 3,
          gap: SPACING.space4,
        }}
      >
        {onClose ? (
          <View style={{ alignItems: 'flex-start' }}>
            <GlassButton icon="close" accessibilityLabel="Fermer" onPress={onClose} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
          <MascotHero size={76} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="footnote" color="label2" accessibilityRole="header">THRIVE MAISON</ThemedText>
            <ThemedText variant="headline">Le moment qui compte, 10 min par soir</ThemedText>
          </View>
        </View>

        {/* Vedette : le mois gratuit d'abord ; sans essai dans l'offering, le prix réel. */}
        {trial && trialLabel ? (
          <View style={{ alignItems: 'center', gap: SPACING.space1 }}>
            <View
              accessible
              accessibilityLabel={`0 $ par mois, pendant ${trialLabel}`}
              style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: SPACING.space2, flexWrap: 'wrap' }}
            >
              <ThemedText style={{ fontFamily: serif, fontSize: 58, lineHeight: 64, letterSpacing: -0.5 }}>0 $</ThemedText>
              <ThemedText color="label2" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, lineHeight: 24 }}>
                {`par mois, pendant ${trialLabel}`}
              </ThemedText>
            </View>
            <ThemedText variant="subheadline" color="label2" style={{ textAlign: 'center' }}>
              Un mois complet, gratuit. Annule quand tu veux.
            </ThemedText>
          </View>
        ) : selected ? (
          <View style={{ alignItems: 'center', gap: SPACING.space1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: SPACING.space2, flexWrap: 'wrap' }}>
              <ThemedText style={{ fontFamily: serif, fontSize: 48, lineHeight: 56 }}>{selected.product.priceString}</ThemedText>
              <ThemedText color="label2" style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, lineHeight: 24 }}>
                {period.replace('/ ', 'par ')}
              </ThemedText>
            </View>
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View
            accessible
            accessibilityLabel={`Aujourd’hui 0 $. ${steps[1].day} : on vous prévient. ${steps[2].day} : premier paiement.`}
            style={{ backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, paddingVertical: SPACING.space4, paddingHorizontal: SPACING.space3 }}
          >
            <View style={{ flexDirection: 'row' }}>
              {steps.map((st) => (
                <View key={st.note} style={{ flex: 1, alignItems: 'center', gap: SPACING.space1 }}>
                  <View
                    style={{
                      width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: st.on ? colors.tint : colors.fill3,
                    }}
                  >
                    <Ionicons name={st.icon} size={16} color={st.on ? colors.tintInk : colors.label2} />
                  </View>
                  <ThemedText variant="footnote">{st.day}</ThemedText>
                  <ThemedText variant="caption1" color="label2">{st.note}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {!canSell ? (
          <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space4, gap: SPACING.space3 }}>
            <ThemedText variant="body">L’abonnement n’est pas disponible pour le moment. Réessayez plus tard.</ThemedText>
            <GlassButton label="Réessayer" onPress={load} />
          </View>
        ) : (
          <>
            <ThemedText variant="title3" accessibilityRole="header">
              {trial ? 'Après le mois gratuit' : 'Choisissez votre formule'}
            </ThemedText>
            <View accessibilityRole="radiogroup" style={{ gap: SPACING.space2 }}>
              {packages.map((pkg) => {
                const isSel = pkg.identifier === selected?.identifier;
                const isAnnual = pkg.identifier === '$rc_annual';
                const isMonthly = pkg.identifier === '$rc_monthly';
                const p = pkg.product;
                const annualPerMonth = isAnnual ? perMonthFromAnnual(p.price) : null;
                const headline = annualPerMonth ? formatMoneyFr(annualPerMonth, p.currencyCode) : p.priceString;
                const unit = isAnnual || isMonthly ? 'par mois' : perPeriodFr(p.subscriptionPeriod).replace('/ ', 'par ');
                const billed = isAnnual
                  ? `${p.priceString} facturés une fois par an`
                  : isMonthly
                    ? `${p.priceString} facturés chaque mois`
                    : `${p.priceString} ${perPeriodFr(p.subscriptionPeriod)}`;
                return (
                  <Pressable
                    key={pkg.identifier}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSel }}
                    accessibilityLabel={`${SUBSCRIPTION_NAME}, ${isAnnual ? 'annuel' : isMonthly ? 'mensuel' : 'formule'} : ${billed}, renouvellement automatique`}
                    onPress={() => setSelectedId(pkg.identifier)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: SPACING.space3, minHeight: SPACING.rowMin + 8,
                      backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space4,
                      borderWidth: 2.5, borderColor: isSel ? colors.tint : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSel ? colors.tint : 'transparent', borderWidth: isSel ? 0 : 2, borderColor: colors.label3,
                      }}
                    >
                      {isSel ? <Ionicons name="checkmark" size={15} color={colors.tintInk} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space2 }}>
                        <ThemedText variant="headline">{isAnnual ? 'Annuel' : isMonthly ? 'Mensuel' : 'Formule'}</ThemedText>
                        {isAnnual && annualSaving ? (
                          <View style={{ backgroundColor: colors.accent, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <ThemedText variant="caption1" style={{ color: colors.accentInk }}>{`−${annualSaving} %`}</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      {/* Prix facturé lisible, jamais caché sous le prix mensuel équivalent. */}
                      <ThemedText variant="subheadline">{billed}</ThemedText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText variant="title3">{headline}</ThemedText>
                      <ThemedText variant="caption1" color="label2">{unit}</ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space4, gap: SPACING.space3 }}>
              {PROMISES.map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: SPACING.space3, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.ok} />
                  <ThemedText variant="subheadline" style={{ flex: 1 }}>{t}</ThemedText>
                </View>
              ))}
            </View>

            {selected && (
              <ThemedText variant="caption1" color="label2" style={{ textAlign: 'center' }}>
                {`${SUBSCRIPTION_NAME} — abonnement ${isoPeriodFr(selected.product.subscriptionPeriod) === '1 an' ? 'annuel' : 'mensuel'} à renouvellement automatique. `}
                {trial
                  ? `Gratuit pendant ${trialLabel}, puis ${selected.product.priceString} ${perPeriodFr(selected.product.subscriptionPeriod)}. `
                  : `${selected.product.priceString} ${perPeriodFr(selected.product.subscriptionPeriod)}. `}
                {Platform.OS === 'ios'
                  ? 'Le paiement est prélevé sur votre compte Apple à la confirmation de l’achat (à la fin de l’essai s’il y en a un). L’abonnement se renouvelle automatiquement, sauf annulation au moins 24 heures avant la fin de la période en cours. Gérez ou annulez-le dans les réglages de votre compte Apple.'
                  : 'Le paiement est prélevé sur votre compte Google Play à la confirmation de l’achat (à la fin de l’essai s’il y en a un). L’abonnement se renouvelle automatiquement jusqu’à annulation. Gérez ou annulez-le dans Google Play › Paiements et abonnements.'}
              </ThemedText>
            )}
          </>
        )}

        <Pressable
          testID="paywall-restore"
          onPress={onRestore}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Restaurer les achats"
          style={{ minHeight: SPACING.touchMin, alignItems: 'center', justifyContent: 'center', opacity: busy !== null ? 0.6 : 1 }}
        >
          {busy === 'restore' ? <ActivityIndicator color={colors.tint} /> : <ThemedText variant="body" color="tint">Restaurer les achats</ThemedText>}
        </Pressable>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.space2 }}>
          {LEGAL.terms ? (
            <ThemedText
              variant="footnote"
              color="label2"
              style={{ textDecorationLine: 'underline', paddingVertical: SPACING.space2 }}
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.terms)}
              accessibilityRole="link"
            >
              Conditions d’utilisation (EULA)
            </ThemedText>
          ) : null}
          {LEGAL.terms && LEGAL.privacy ? <ThemedText variant="footnote" color="label2" style={{ paddingVertical: SPACING.space2 }}>·</ThemedText> : null}
          {LEGAL.privacy ? (
            <ThemedText
              variant="footnote"
              color="label2"
              style={{ textDecorationLine: 'underline', paddingVertical: SPACING.space2 }}
              onPress={() => WebBrowser.openBrowserAsync(LEGAL.privacy)}
              accessibilityRole="link"
            >
              Politique de confidentialité
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>

      {canSell ? (
        <View style={{ position: 'absolute', left: SPACING.space4, right: SPACING.space4, bottom: SPACING.space4 }}>
          <GlassSurface strong radius={30} style={{ padding: 6 }}>
            <Pressable
              onPress={onBuy}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={trial ? (trialLabel === '1 mois' ? 'Commencer mon mois gratuit' : `Commencer mon essai de ${trialLabel}`) : 'M’abonner'}
              style={{
                minHeight: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
                opacity: busy !== null ? 0.6 : 1,
              }}
            >
              {busy === 'buy' ? (
                <ActivityIndicator color={colors.accentInk} />
              ) : (
                <ThemedText variant="headline" style={{ color: colors.accentInk }}>
                  {trial ? (trialLabel === '1 mois' ? 'Commencer mon mois gratuit' : `Commencer mon essai de ${trialLabel}`) : 'M’abonner'}
                </ThemedText>
              )}
            </Pressable>
            {trial && firstPaymentDay ? (
              <ThemedText variant="caption1" color="label2" style={{ textAlign: 'center', paddingTop: SPACING.space1, paddingBottom: 2 }}>
                {`0 $ aujourd’hui · rien à payer avant le ${firstPaymentDay}`}
              </ThemedText>
            ) : null}
          </GlassSurface>
        </View>
      ) : null}
    </View>
  );
}
