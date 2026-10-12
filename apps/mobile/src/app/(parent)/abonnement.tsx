import React from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paywall } from '../../components/subscription/Paywall';
import { SubscriptionLoader } from '../../components/subscription/SubscriptionLoader';
import { SubscriptionSettings } from '../../components/subscription/SubscriptionSettings';
import { useEntitlement } from '../../hooks/useEntitlement';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';
import { GlassButton, SPACING, ThemedText, useTheme } from '../../design';

/** Écran d'abonnement : paywall (D2) si pas d'accès, sinon « Mon abonnement » (X2). */
export default function AbonnementScreen() {
  const { isLoading, hasAccess } = useEntitlement();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (isLoading) return <SubscriptionLoader />;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  if (!hasAccess) {
    return <Paywall onSubscribed={close} onClose={close} />;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgGrouped }}
      contentContainerStyle={{ paddingTop: insets.top + SPACING.space2, paddingBottom: SPACING.space6, gap: SPACING.space4 }}
    >
      <View style={{ paddingHorizontal: SPACING.space4, gap: SPACING.space3, alignItems: 'flex-start' }}>
        <GlassButton icon="chevron-back" accessibilityLabel="Retour" onPress={close} />
        <ThemedText variant="largeTitle" accessibilityRole="header">Mon abonnement</ThemedText>
      </View>
      <View style={{ paddingHorizontal: SPACING.space4 }}>
        <BillingIssueBanner />
      </View>
      <SubscriptionSettings />
    </ScrollView>
  );
}
