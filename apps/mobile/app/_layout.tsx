import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { NotificationService } from '@thrive/shared';
import { useAuthStore } from '../stores/auth.store';

export default function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, hydrate } = useAuthStore();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Enregistrer le token push dès la connexion
    NotificationService.registerForPushNotifications();

    // Navigation lors d'un tap sur une notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;

      if (data.conversation_id) {
        router.push(`/chat/${data.conversation_id}`);
      } else if (data.badge_id) {
        router.push('/badges');
      } else if (data.session_id) {
        router.push('/sessions');
      }
    });

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
