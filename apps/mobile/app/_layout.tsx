/**
 * RootLayout + NavigationGuard
 *
 * Table de redirection (enum Supabase en MAJUSCULES) :
 *   Non connecté  →  /(auth)/login
 *   PARENT        →  /(parent)/messages
 *   COACH         →  /(coach)/inbox
 *   CHILD         →  /(athlete)           [groupe expo pour les enfants]
 *   ADMIN         →  /(admin)
 *   SUPER_ADMIN   →  /(admin)
 */
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '@thrive/shared/src/services/NotificationService';
import { useAuthStore, UserRole } from '../src/stores/auth.store';

// ── Table rôle → route d'entrée ─────────────────────────────────────────────
const ROLE_HOME: Record<UserRole, string> = {
  PARENT:      '/(parent)/messages',
  COACH:       '/(coach)/inbox',
  CHILD:       '/(athlete)',
  ADMIN:       '/(admin)',
  SUPER_ADMIN: '/(admin)',
};

// Groupe Expo Router (segment[0]) correspondant à chaque rôle
const ROLE_SEGMENT: Record<UserRole, string> = {
  PARENT:      '(parent)',
  COACH:       '(coach)',
  CHILD:       '(athlete)',
  ADMIN:       '(admin)',
  SUPER_ADMIN: '(admin)',
};

export default function RootLayout() {
  const router      = useRouter();
  const segments    = useSegments();
  const { isAuthenticated, role, isLoading, hydrate } = useAuthStore();
  const notifRef    = useRef<Notifications.Subscription>();

  // Charger la session au démarrage
  useEffect(() => {
    hydrate();
  }, []);

  // ── NavigationGuard ────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return; // attendre hydrate()

    const currentSegment = segments[0] as string | undefined;
    const inAuthGroup    = currentSegment === '(auth)';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Connecté : rediriger vers le bon groupe si pas déjà dedans
    const resolvedRole    = role ?? 'PARENT';
    const expectedSegment = ROLE_SEGMENT[resolvedRole];

    if (currentSegment !== expectedSegment) {
      router.replace(ROLE_HOME[resolvedRole] as any);
    }
  }, [isAuthenticated, role, isLoading, segments]);

  // ── Notifications push ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    NotificationService.registerForPushNotifications();

    notifRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data.conversation_id) router.push(`/chat/${data.conversation_id}`);
      else if (data.badge_id)   router.push('/badges');
      else if (data.session_id) router.push('/sessions');
    });

    return () => { notifRef.current?.remove(); };
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
