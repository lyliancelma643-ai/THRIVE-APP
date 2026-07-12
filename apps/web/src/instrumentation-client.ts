// Sentry — navigateur. C'est ici que remontent les erreurs vécues par les
// parents/coachs (80 % mobile). Inerte sans NEXT_PUBLIC_SENTRY_DSN.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Pas de Session Replay : données de mineurs à l'écran (Loi 25) — on ne
  // capture jamais de rendu. Les breadcrumbs par défaut suffisent.
  integrations: (defaults) => defaults.filter((i) => i.name !== 'Replay'),
});

// Trace les navigations App Router (obligatoire depuis Sentry v9).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
