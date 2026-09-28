import React from 'react';
import { router } from 'expo-router';
import { Paywall } from '../../src/components/subscription/Paywall';
import { SubscriptionLoader } from '../../src/components/subscription/SubscriptionLoader';
import { SubscriptionSettings } from '../../src/components/subscription/SubscriptionSettings';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { ScrollView, StyleSheet } from 'react-native';

/** Écran d'abonnement : paywall si pas d'accès, sinon état + gestion. */
export default function AbonnementScreen() {
  const { isLoading, hasAccess } = useEntitlement();
  if (isLoading) return <SubscriptionLoader />;
  if (!hasAccess) return <Paywall onSubscribed={() => router.back()} />;
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SubscriptionSettings />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingTop: 60 },
});
