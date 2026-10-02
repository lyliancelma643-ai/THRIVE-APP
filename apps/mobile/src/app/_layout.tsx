import { Sentry, setSentryUser } from '../lib/sentry';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';

function RootLayout() {
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  
  // Initialisation des notifications push
  usePushNotifications(user?.id);

  useEffect(() => { hydrate(); }, []);

  // Sentry : rattache les erreurs au compte (uuid seulement, jamais le courriel).
  useEffect(() => { setSentryUser(user?.id ?? null); }, [user?.id]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      // Redirection selon le rôle
      switch (user?.role) {
        case 'COACH':
          router.replace('/(coach)/dashboard');
          break;
        case 'ADMIN':
        case 'SUPER_ADMIN':
          router.replace('/(admin)/dashboard');
          break;
        default:
          router.replace('/(parent)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments, user?.role]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="(coach)" />
    </Stack>
  );
}

// Sentry.wrap : capte les erreurs de rendu et les crashs de démarrage.
export default Sentry.wrap(RootLayout);
