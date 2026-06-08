/**
 * RootLayout — Gardien de navigation basé sur le rôle.
 *
 * Table de redirection :
 *   Non connecté  → /(auth)/login
 *   parent        → /(parent)/messages   (premier écran parent)
 *   coach         → /(coach)/inbox       (premier écran coach)
 *   admin         → /(admin)             (à créer si besoin)
 *   athlete       → /(athlete)           (espace athlète existant)
 *
 * Le guard s'exécute dès que isAuthenticated ou role change.
 * Il ne redirige pas si on est DÉJÀ dans le bon groupe.
 */
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '@thrive/shared/src/services/NotificationService';
import { useAuthStore, UserRole } from '../src/stores/auth.store';

/** Table rôle → route d'entrée */
const ROLE_HOME: Record<NonNullable<UserRole>, string> = {
  parent:  '/(parent)/messages',
  coach:   '/(coach)/inbox',
  admin:   '/(admin)',
  athlete: '/(athlete)',
};

/** Groupe Expo Router (segment[0]) correspondant à chaque rôle */
const ROLE_SEGMENT: Record<NonNullable<UserRole>, string> = {
  parent:  '(parent)',
  coach:   '(coach)',
  admin:   '(admin)',
  athlete: '(athlete)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, role, isLoading, hydrate } = useAuthStore();
  const responseListener = useRef<Notifications.Subscription>();

  // Charger la session au démarrage
  useEffect(() => {
    hydrate();
  }, []);

  // ─── Guard de navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return; // attendre que hydrate() soit terminé

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      // Pas connecté → toujours vers login
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Connecté → rediriger vers le bon groupe si pas déjà dedans
    const resolvedRole = role ?? 'athlete';
    const expectedSegment = ROLE_SEGMENT[resolvedRole];
    const currentSegment = segments[0];

    if (currentSegment !== expectedSegment) {
      router.replace(ROLE_HOME[resolvedRole] as any);
    }
  }, [isAuthenticated, role, isLoading, segments]);

  // ─── Notifications push ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    NotificationService.registerForPushNotifications();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data.conversation_id) router.push(`/chat/${data.conversation_id}`);
      else if (data.badge_id)   router.push('/badges');
      else if (data.session_id) router.push('/sessions');
    });

    return () => { responseListener.current?.remove(); };
  }, [isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)"   />
      <Stack.Screen name="(coach)"  />
      <Stack.Screen name="(parent)" />
      <Stack.Screen name="(athlete)" />
      <Stack.Screen name="(admin)"  />
    </Stack>
  );
}
