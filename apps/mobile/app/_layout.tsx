import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { useAuth, useOnboarding } from '@thrive/shared';
import * as Notifications from 'expo-notifications';

/**
 * Root layout — responsabilités :
 * 1. Configure le handler de notifications push.
 * 2. Redirige vers l'onboarding si l'utilisateur ne l'a pas encore complété.
 * 3. Redirige vers le login si non authentifié.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const { user, loading: authLoading } = useAuth();
  const { onboardingCompleted, loading: onboardingLoading } = useOnboarding(user?.id);

  useEffect(() => {
    if (authLoading || onboardingLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Si l'onboarding n'est pas encore fait → rediriger vers le wizard du rôle
    if (onboardingCompleted === false) {
      const role = (user as any)?.user_metadata?.role ?? 'coach';
      if (role === 'parent') {
        router.replace('/(parent)/onboarding');
      } else {
        router.replace('/(coach)/onboarding');
      }
    }

    // Navigation sur tap de notification
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.conversationId) {
        const role = (user as any)?.user_metadata?.role ?? 'coach';
        router.push(
          `/(${role})/chat/${data.conversationId}` as any
        );
      }
    });

    return () => sub.remove();
  }, [user, authLoading, onboardingCompleted, onboardingLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(coach)" />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
