// Sentry — runtime Edge (middleware.ts notamment : c'est lui qui garde
// /admin, /coach et /parent — une erreur ici doit remonter en alerte).
// Inerte tant que NEXT_PUBLIC_SENTRY_DSN n'est pas posé dans Vercel.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
