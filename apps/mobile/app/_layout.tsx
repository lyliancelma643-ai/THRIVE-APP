// Racine non routée tant que src/app existe (Expo Router préfère src/app) :
// l'import garde Sentry actif si ce dossier redevient la racine.
import '../src/lib/sentry';
import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import type { EventSubscription } from 'expo-modules-core';
import { NotificationService } from '@thrive/shared/services/NotificationService';
import { useAuthStore } from '../src/stores/auth.store';
import { useRevenueCatIdentity } from '../src/hooks/useRevenueCatIdentity';

export default function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const responseListener = useRef<EventSubscription | null>(null);

  // RevenueCat : App User ID = id Supabase (logIn à la connexion, logOut à la
  // déconnexion) + état d'abonnement en direct pour toute l'app.
  useRevenueCatIdentity();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    NotificationService.registerForPushNotifications();

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
