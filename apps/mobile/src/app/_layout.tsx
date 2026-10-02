import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRevenueCatIdentity } from '../hooks/useRevenueCatIdentity';

// Racine unique de l'app mobile. Expo Router prend `src/app/` dès que ce
// dossier existe : tout écran doit vivre ici (l'ancien `app/` n'est pas embarqué).

function homeFor(role: string | undefined) {
  return role === 'COACH' ? '/(coach)/dashboard' : '/(parent)/dashboard';
}

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // RevenueCat : App User ID = id Supabase (logIn / logOut suivent la session).
  useRevenueCatIdentity();

  // Notifications : permission demandée seulement une fois connecté.
  usePushNotifications(isAuthenticated ? user?.id : undefined);

  useEffect(() => {
    hydrate();
  }, []);

  // Redirection selon la session et le rôle (app_metadata, non falsifiable).
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      Alert.alert(
        'Espace administrateur',
        'L’administration de THRIVE se fait sur le web : app.thrivesportpositive.com.',
      );
      signOut();
      return;
    }

    const inCoachGroup = segments[0] === '(coach)';
    const inParentGroup = segments[0] === '(parent)';
    const isCoach = user?.role === 'COACH';
    if (inAuthGroup || (isCoach && inParentGroup) || (!isCoach && inCoachGroup) || !segments[0]) {
      router.replace(homeFor(user?.role));
    }
  }, [isAuthenticated, isLoading, segments, user?.role]);

  // Ouverture d'une notification → écran concerné, dans l'espace du rôle.
  useEffect(() => {
    if (!isAuthenticated) return;
    const group = user?.role === 'COACH' ? '(coach)' : '(parent)';
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data.conversation_id) {
        router.push(`/${group}/chat/${data.conversation_id}`);
      } else if (group === '(coach)' && data.session_id) {
        router.push('/(coach)/sessions');
      } else {
        router.push(`/${group}/notifications`);
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, user?.role]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="(coach)" />
    </Stack>
  );
}
