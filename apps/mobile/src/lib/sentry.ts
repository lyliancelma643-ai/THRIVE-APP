// Sentry — app mobile (crashs JS et natifs). Inerte tant que
// EXPO_PUBLIC_SENTRY_DSN n'est pas posé (eas.json / variables EAS).
// Importé en tout premier par le layout racine, pour capter les erreurs de démarrage.
//
// Public : parents et mineurs (Loi 25). Pas de Session Replay, pas de capture
// d'écran ni de hiérarchie de vues, pas d'IP ni de courriel : seul l'id
// opaque de l'utilisateur est conservé pour regrouper les erreurs.
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const TOKEN_QUERY = /([?&](?:token|access_token|refresh_token|code|token_hash)=)[^&#\s]+/gi;

export function scrubText(s: string): string {
  return s.replace(JWT, '[jwt]').replace(EMAIL, '[courriel]').replace(TOKEN_QUERY, '$1[masqué]');
}

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
  release: `${Constants.expoConfig?.ios?.bundleIdentifier ?? 'app.thrive.mobile'}@${Constants.expoConfig?.version ?? '0.0.0'}`,
  sendDefaultPii: false,
  attachScreenshot: false,
  attachViewHierarchy: false,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    if (event.message) event.message = scrubText(event.message);
    for (const ex of event.exception?.values ?? []) {
      if (ex.value) ex.value = scrubText(ex.value);
    }
    for (const b of event.breadcrumbs ?? []) {
      if (b.message) b.message = scrubText(b.message);
      if (typeof b.data?.url === 'string') b.data.url = scrubText(b.data.url);
    }
    return event;
  },
});

/** À appeler à la connexion / déconnexion : uuid Supabase uniquement. */
export function setSentryUser(userId: string | null) {
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
