import { Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Icon, Tag, ThemedText, useTheme } from '../../design';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { PROPORTIONAL, Packshot, SoftTag } from './parts';
import { buildMaisonOfferData, type MaisonOfferData } from './maisonOffer';
import { freeTrialPeriod, useMaisonOffering } from './useMaisonOffering';

/**
 * Carte « THRIVE Maison » de Y (`.card` : vignette, nom, étiquette, deux prix, essai, App Store). Vue pure : toutes
 * les valeurs arrivent en props. Anti-steering : aucun lien ni texte vers un autre moyen de paiement.
 */
export function MaisonOfferCardView({ data, onPress }: { data: MaisonOfferData; onPress?: () => void }) {
  const { colors } = useTheme();
  const tile = (bg: string, price: string, unit: string) => (
    <View style={{ flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: bg }}>
      <ThemedText variant="title2" weight={500} style={{ fontSize: 22, lineHeight: 26, letterSpacing: 0 }}>{price}</ThemedText>
      <ThemedText variant="foot" color="label2">{unit}</ThemedText>
    </View>
  );
  return (
    <Card
      onPress={onPress}
      accessibilityLabel="THRIVE Maison. Voir l’abonnement."
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Packshot id="ACT-0603" />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
            <ThemedText variant="title3" style={{ flexShrink: 1 }}>THRIVE Maison</ThemedText>
            {data.badge === 'inclus' ? <Tag label="Inclus" tone="ok" style={{ alignSelf: 'center' }} /> : null}
            {data.badge === 'abonnement' ? <SoftTag label="Ton abonnement" tone="tint" style={{ alignSelf: 'center' }} /> : null}
          </View>
          <ThemedText variant="foot" color="label2" style={PROPORTIONAL}>Le moment qui compte, 10 minutes par jour</ThemedText>
        </View>
      </View>

      {data.monthly || data.annual ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {data.monthly ? tile(colors.fill4, data.monthly.price, data.monthly.unit) : null}
          {data.annual ? tile(colors.tintSoft, data.annual.price, data.annual.unit) : null}
        </View>
      ) : (
        <ThemedText variant="foot" color="label2" style={{ marginTop: 12 }}>
          {data.loading ? 'Chargement des prix…' : 'Les prix s’affichent dès que le store répond.'}
        </ThemedText>
      )}

      {data.trialLine ? (
        <ThemedText variant="foot" color="label2" style={[PROPORTIONAL, { marginTop: 8 }]}>{data.trialLine}</ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <Icon name="phone" size={13} color={colors.label2} />
        <ThemedText variant="foot" color="label2">{`Abonnement géré par ${data.storeName}`}</ThemedText>
      </View>
    </Card>
  );
}

/** Conteneur : prix, périodes et essai lus dans l'offering RevenueCat courant ; toucher la carte ouvre « Mon abonnement ». */
export function MaisonOfferCard({ included }: { included: boolean }) {
  const { loading, monthly, annual } = useMaisonOffering();
  const { isSubscribed } = useEntitlement();
  const sourceMaison = useSubscriptionStore((s) => s.access?.sourceMaison);
  const trialIso = (annual && freeTrialPeriod(annual)) || (monthly && freeTrialPeriod(monthly)) || null;
  const data = buildMaisonOfferData({
    loading,
    monthly: monthly ? { priceString: monthly.product.priceString, price: monthly.product.price, subscriptionPeriod: monthly.product.subscriptionPeriod } : null,
    annual: annual ? { priceString: annual.product.priceString, price: annual.product.price, subscriptionPeriod: annual.product.subscriptionPeriod } : null,
    trialIso,
    android: Platform.OS === 'android',
    badge: included || sourceMaison === 'pack' ? 'inclus' : isSubscribed ? 'abonnement' : null,
  });
  return <MaisonOfferCardView data={data} onPress={() => router.push('/(parent)/abonnement')} />;
}
