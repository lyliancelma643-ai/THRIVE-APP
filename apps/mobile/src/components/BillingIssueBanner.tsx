import React, { useCallback, useEffect, useState } from 'react';
import { View, Linking, Platform } from 'react-native';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '../stores/auth.store';
import { useSubscriptionStore } from '../stores/subscription.store';
import { showNativeSubscriptionManagement } from '../services/purchases';
import { isNativeStoreManagementUrl } from '../services/subscription-logic';
import { Button, Card, Icon, ThemedText, useTheme, withAlpha } from '../design';

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

  const { colors } = useTheme();
  if (!hasIssue) return null;
  return (
    <View accessibilityRole="alert" style={{ marginBottom: 16 }}>
      <Card>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(colors.warn, 0.14) }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="info" size={18} color={colors.warn} />
          <ThemedText variant="headline" style={{ flex: 1 }}>Mettez à jour votre moyen de paiement</ThemedText>
        </View>
        <ThemedText variant="sub" color="label2" style={{ marginBottom: 12 }}>
          Le dernier paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement pour conserver votre accès.
        </ThemedText>
        <Button size="md" variant="gray" label="Gérer mon abonnement" onPress={manage} accessibilityLabel="Gérer mon abonnement" />
      </Card>
    </View>
  );
}
