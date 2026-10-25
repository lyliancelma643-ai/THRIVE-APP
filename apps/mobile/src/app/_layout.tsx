import { Sentry, setSentryUser } from '../lib/sentry';
import { useEffect } from 'react';
import type React from 'react';
import { Alert, AppState, View } from 'react-native';
import { supabaseClient as supabase } from '@thrive/shared';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRevenueCatIdentity } from '../hooks/useRevenueCatIdentity';
import { useFonts } from 'expo-font';
import { FONT_ASSETS, FORM_COLUMN, ThemeProvider, useTheme } from '../design';

// Racine unique de l'app mobile. Expo Router prend `src/app/` dès que ce
// dossier existe : tout écran doit vivre ici (l'ancien `app/` n'est pas embarqué).

function homeFor(role: string | undefined) {
  return role === 'COACH' ? '/(coach)/dashboard' : '/(parent)/maison';
}

// Écrans de contenu : pleine largeur sur iPad (en-tête, onglets et fond d'un bord à l'autre) ; le centrage du contenu
// est fait par HubScreen. Tous les autres (compte, enfants, connexion…) restent en colonne de 720 pt, sur le MÊME fond.
const FULL_WIDTH = new Set([
  'maison', 'bilans', 'seances', 'toutes', 'programme', 'carnet', 'favoris', 'quand-il-dit-non', 'sources',
  'quand-consulter', 'videos', 'parcours', 'activite', 'moment', 'video', 'questionnaire-enfant', 'messages',
]);
// Mode activité : toujours à la lampe (Veillée), quel que soit le style choisi.
const NIGHT = new Set(['moment', 'video', 'questionnaire-enfant']);

function Column({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const segments = useSegments() as string[];
  const route = segments[0] === '(parent)' ? segments[1] : undefined;
  const full = segments[0] === '__ecran' || (!!route && FULL_WIDTH.has(route));
  const bg = route && NIGHT.has(route) ? '#022539' : colors.bgGrouped;
  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: full ? undefined : FORM_COLUMN, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function RootLayout() {
  // Polices Inter / Fraunces : non bloquant, repli police système tant qu'elles ne sont pas prêtes.
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // RevenueCat : App User ID = id Supabase (logIn / logOut suivent la session).
  useRevenueCatIdentity();

  // Sentry : rattache les erreurs au compte (uuid seulement, jamais le courriel).
  useEffect(() => { setSentryUser(user?.id ?? null); }, [user?.id]);

  // Notifications : permission demandée seulement une fois connecté.
  usePushNotifications(isAuthenticated ? user?.id : undefined);

  useEffect(() => {
    hydrate();
  }, []);

  // Renouvellement du jeton : actif seulement quand l'app est au premier plan
  // (sinon les minuteries sont suspendues et le jeton expire sans qu'on le sache).
  useEffect(() => {
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => { sub.remove(); supabase.auth.stopAutoRefresh(); };
  }, []);

  // Redirection selon la session et le rôle (app_metadata, non falsifiable).
  useEffect(() => {
    if (isLoading) return;
    // Galerie de contrôle des primitives (dev uniquement) : accessible sans session.
    if (__DEV__ && (segments[0] === '__design' || segments[0] === '__ecran')) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inWelcome = segments[0] === 'welcome';

    if (!isAuthenticated) {
      // Arrivée non connectée : écran Bienvenue (slogans), puis connexion / inscription.
      if (!inAuthGroup && !inWelcome) router.replace('/welcome');
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

    // Rôle inconnu (CHILD, vide…) : pas d'espace dans l'app. On le dit et on
    // déconnecte, plutôt que de l'envoyer dans l'espace parent.
    if (user?.role !== 'COACH' && user?.role !== 'PARENT') {
      Alert.alert(
        'Compte non configuré',
        'Ton compte n’a pas encore d’espace dans l’application. Écris-nous à support@thrivesportpositive.com.',
      );
      signOut();
      return;
    }

    const inCoachGroup = segments[0] === '(coach)';
    const inParentGroup = segments[0] === '(parent)';
    const isCoach = user?.role === 'COACH';
    if (inAuthGroup || inWelcome || (isCoach && inParentGroup) || (!isCoach && inCoachGroup) || !segments[0]) {
      // Bienvenue / connexion retirées de la pile : un glissement depuis le bord de l'écran ne peut plus y revenir.
      if (router.canDismiss()) router.dismissAll();
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
    <ThemeProvider fontsLoaded={fontsLoaded}>
      <Column>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        {/* Espaces connectés : pas de geste « retour » depuis le bord (on reste dans l'app, sur Maison / Bilan / Séances). */}
        <Stack.Screen name="(parent)" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="(coach)" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
      </Column>
    </ThemeProvider>
  );
}

// Sentry.wrap : capte les erreurs de rendu et les crashs de démarrage.
export default Sentry.wrap(RootLayout);

export { ErrorBoundary } from '../components/ErrorBoundary';
