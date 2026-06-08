/**
 * RootLayout — Gardien de navigation basé sur le rôle.
 *
 * Logique de redirection :
 *  - Pas de session        → /login
 *  - role === 'parent'     → /(parent)/dashboard
 *  - role === 'coach'      → /(coach)
 *  - role === 'admin'      → /(admin)
 *  - role === 'athlete'    → /(tabs)
 *
 * En DEV uniquement : si EXPO_PUBLIC_DEV_ROLE est défini,
 * il bypass Supabase et simule un rôle local :
 *   EXPO_PUBLIC_DEV_ROLE=parent  → redirige vers /(parent)/dashboard
 *   EXPO_PUBLIC_DEV_ROLE=coach   → redirige vers /(coach)
 */
import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth, UserRole } from '../context/AuthContext';

/** Table de correspondance rôle → route Expo Router */
const ROLE_ROUTES: Record<NonNullable<UserRole>, string> = {
  parent:  '/(parent)/dashboard',
  coach:   '/(coach)',
  admin:   '/(admin)',
  athlete: '/(tabs)',
};

function NavigationGuard() {
  const { session, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // ─── Mode DEV : bypass Supabase ────────────────────────────────────────────
  const devRole = process.env.EXPO_PUBLIC_DEV_ROLE as UserRole | undefined;

  useEffect(() => {
    if (loading) return;

    // Bypass dev : on force le rôle sans Supabase
    if (__DEV__ && devRole) {
      const target = ROLE_ROUTES[devRole] ?? '/(tabs)';
      const alreadyThere = segments.join('/').startsWith(
        target.replace(/^\//,'').split('/')[0]
      );
      if (!alreadyThere) router.replace(target as any);
      return;
    }

    // ─── Production : auth réelle ───────────────────────────────────────────
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'role-select';

    if (!session) {
      // Pas connecté → login
      if (!inAuthGroup) router.replace('/login');
      return;
    }

    // Connecté → rediriger vers le bon espace si pas déjà dedans
    const target = ROLE_ROUTES[role ?? 'athlete'];
    const rootSegment = target.replace(/^\//,'').replace(/\(|\)/g,'').split('/')[0];
    const currentRoot = segments[0]?.replace(/\(|\)/g,'');

    if (currentRoot !== rootSegment) {
      router.replace(target as any);
    }
  }, [session, role, loading, segments, devRole]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1b263b', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#c5a059" size="large" />
      </View>
    );
  }

  return null;
}

function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="login"           options={{ headerShown: false }} />
      <Stack.Screen name="role-select"     options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
      <Stack.Screen name="(parent)"        options={{ headerShown: false }} />
      <Stack.Screen name="(coach)"         options={{ headerShown: false }} />
      <Stack.Screen name="(admin)"         options={{ headerShown: false }} />
      <Stack.Screen name="session/[id]"    options={{ presentation: 'modal' }} />
      <Stack.Screen name="player/[id]"     options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View className="flex-1 bg-primary-background">
          <StatusBar style="light" />
          <NavigationGuard />
          <RootStack />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
