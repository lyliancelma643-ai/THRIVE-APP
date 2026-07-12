// Sentry — runtime serveur Node (SSR, route handlers).
// Inerte tant que NEXT_PUBLIC_SENTRY_DSN n'est pas posé dans Vercel.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // 10 % des transactions suffisent pour le volume actuel ; monter si besoin.
  tracesSampleRate: 0.1,
});
