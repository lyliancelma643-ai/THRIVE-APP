import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  
  // Initialisation des notifications push
  usePushNotifications(user?.id);

  useEffect(() => { hydrate(); }, []);

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
