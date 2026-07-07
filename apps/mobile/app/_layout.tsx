import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import type { EventSubscription } from 'expo-modules-core';
import { NotificationService } from '@thrive/shared/services/NotificationService';
import { useAuthStore } from '../src/stores/auth.store';
import { initPurchases } from '../src/services/purchases';

export default function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    NotificationService.registerForPushNotifications();
    // RevenueCat : no-op si clé absente ou module natif indisponible (Expo Go)
    initPurchases(useAuthStore.getState().user?.id);

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;

      if (data.conversation_id) {
        router.push(`/chat/${data.conversation_id}`);
      } else if (data.badge_id) {
        router.push('/badges');
      } else if (data.session_id) {
        router.push('/sessions');
      }
    },
    );

    return () => {
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(coach)" />
      <Stack.Screen name="(parent)" />
    </Stack>
  );
}
