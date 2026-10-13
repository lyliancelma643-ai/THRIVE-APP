import React from 'react';
import { router } from 'expo-router';
import { Paywall } from '../../components/subscription/Paywall';
import { AbonnementFrame } from '../../components/subscription/AbonnementFrame';
import { SubscriptionLoader } from '../../components/subscription/SubscriptionLoader';
import { SubscriptionSettings } from '../../components/subscription/SubscriptionSettings';
import { useEntitlement } from '../../hooks/useEntitlement';
import { BillingIssueBanner } from '../../components/BillingIssueBanner';

/** Écran d'abonnement : paywall (D2) si pas d'accès, sinon « Mon abonnement » (X2). */
export default function AbonnementScreen() {
  const { isLoading, hasAccess } = useEntitlement();
  if (isLoading) return <SubscriptionLoader />;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  if (!hasAccess) {
    return <Paywall onSubscribed={close} onClose={close} />;
  }
  return (
    <AbonnementFrame onBack={close} banner={<BillingIssueBanner />}>
      <SubscriptionSettings />
    </AbonnementFrame>
  );
}
