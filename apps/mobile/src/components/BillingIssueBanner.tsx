import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '../stores/auth.store';
import { useSubscriptionStore } from '../stores/subscription.store';
import { showNativeSubscriptionManagement } from '../services/purchases';
import { isNativeStoreManagementUrl } from '../services/subscription-logic';

/** Bannière « Mettez à jour votre moyen de paiement » quand billing_subscriptions.billing_issue_at est renseigné. */
export function BillingIssueBanner() {
  const userId = useAuthStore((s) => s.user?.id);
  const [hasIssue, setHasIssue] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase
      .from('billing_subscriptions')
      .select('billing_issue_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setHasIssue(Boolean((data as { billing_issue_at: string | null } | null)?.billing_issue_at));
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const manage = useCallback(async () => {
    try {
      await showNativeSubscriptionManagement();
    } catch {
      const info = useSubscriptionStore.getState().customerInfo;
      if (isNativeStoreManagementUrl(info?.managementURL, Platform.OS)) Linking.openURL(info!.managementURL!);
    }
  }, []);

  if (!hasIssue) return null;
  return (
    <View className="bg-amber-100 border border-amber-300 rounded-2xl p-4 mb-4" accessibilityRole="alert">
      <Text className="font-bold text-amber-900 mb-1">Mettez à jour votre moyen de paiement</Text>
      <Text className="text-amber-900 text-sm mb-3">
        Le dernier paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement pour conserver votre accès.
      </Text>
      <Pressable
        onPress={manage}
        accessibilityRole="button"
        accessibilityLabel="Gérer mon abonnement"
        accessibilityHint="Ouvre la gestion de l’abonnement pour mettre à jour le moyen de paiement"
        hitSlop={8}
        className="bg-black rounded-xl px-4 py-2 self-start"
      >
        <Text className="text-white font-semibold">Gérer mon abonnement</Text>
      </Pressable>
    </View>
  );
}
