import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton, Pill, RADIUS, SPACING, ThemedText, VignetteImage, useTheme } from '../../design';
import {
  annualSavingPercent,
  formatMoneyFr,
  isoPeriodFr,
  perMonthFromAnnual,
  perPeriodFr,
} from '../../services/subscription-logic';
import { Card } from './Card';
import { freeTrialPeriod, useMaisonOffering } from './useMaisonOffering';

/**
 * Carte « THRIVE Maison » de l'écran Offres. Prix, période et essai viennent de
 * l'offering RevenueCat (jamais en dur) ; « par mois » de l'annuel = prix annuel / 12 calculé.
 * Anti-steering : aucun lien ni texte vers un autre moyen de paiement.
 */
export function MaisonOfferCard({ included }: { included: boolean }) {
  const { colors } = useTheme();
  const { loading, monthly, annual } = useMaisonOffering();
  const trial = (annual && freeTrialPeriod(annual)) || (monthly && freeTrialPeriod(monthly)) || null;
  const saving = annualSavingPercent(monthly?.product.price, annual?.product.price);
  const annualPerMonth = perMonthFromAnnual(annual?.product.price);
  const store = Platform.OS === 'android' ? 'Google Play' : 'l’App Store';

  const tile = (bg: string, price: string, sub: string) => (
    <View style={{ flex: 1, borderRadius: RADIUS.chip + 4, padding: SPACING.space3, backgroundColor: bg }}>
      <ThemedText variant="headline">{price}</ThemedText>
      <ThemedText variant="footnote" color="label2">{sub}</ThemedText>
    </View>
  );

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: SPACING.space3, alignItems: 'center' }}>
        <VignetteImage id="ACT-0603" style={{ width: 64, height: 64, borderRadius: 18 }} accessibilityLabel="" />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText variant="title3" accessibilityRole="header">THRIVE Maison</ThemedText>
            {included ? <Pill label="Inclus" tone="ok" /> : null}
          </View>
          <ThemedText variant="footnote" color="label2">Le moment qui compte, 10 minutes par jour</ThemedText>
        </View>
      </View>

      {monthly || annual ? (
        <View style={{ flexDirection: 'row', gap: SPACING.space2, marginTop: SPACING.space1 }}>
          {monthly ? tile(colors.fill3, monthly.product.priceString, perPeriodFr(monthly.product.subscriptionPeriod).replace('/ ', 'par ')) : null}
          {annual
            ? tile(
                colors.fill3,
                annual.product.priceString,
                `par an${saving ? ` · −${saving} %` : ''}`,
              )
            : null}
        </View>
      ) : (
        <ThemedText variant="footnote" color="label2">
          {loading ? 'Chargement des prix…' : 'Les prix s’affichent dès que le store répond.'}
        </ThemedText>
      )}

      {annual && annualPerMonth ? (
        <ThemedText variant="footnote" color="label2">
          {`Annuel : soit ${formatMoneyFr(annualPerMonth, annual.product.currencyCode)} par mois.`}
        </ThemedText>
      ) : null}
      {trial ? (
        <ThemedText variant="footnote" color="label2">
          {`${isoPeriodFr(trial)} d’essai gratuit · partagé avec ton co-parent`}
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.space1 }}>
        <Ionicons name="phone-portrait-outline" size={13} color={colors.label2} />
        <ThemedText variant="footnote" color="label2">{`Abonnement géré par ${store}`}</ThemedText>
      </View>
      <View style={{ alignItems: 'flex-start', marginTop: SPACING.space1 }}>
        <GlassButton
          label={included ? 'Mon abonnement' : 'Découvrir l’abonnement'}
          onPress={() => router.push('/(parent)/abonnement')}
        />
      </View>
    </Card>
  );
}
