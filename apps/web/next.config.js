/** @type {import('next').NextConfig} */

// ── En-têtes de sécurité (OWASP Secure Headers / ASVS V14) ──
// CSP volontairement fonctionnelle : l'app s'appuie sur des styles inline
// (bilans/passeport rendus via un template HTML) et sur le lecteur Wistia.
// 'unsafe-inline'/'unsafe-eval' sur script-src restent nécessaires tant que
// Next.js n'est pas passé à une CSP à base de nonce — à durcir ensuite.
const SUPABASE = 'https://*.supabase.co wss://*.supabase.co';
const WISTIA = 'https://*.wistia.com https://*.wistia.net https://*.wistiastatic.com https://*.akamaihd.net';
// Ingest Sentry (télémétrie erreurs) — couvre les DSN region-based (o123.ingest.us.sentry.io).
const SENTRY = 'https://*.sentry.io';

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${WISTIA}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${SUPABASE} ${WISTIA}`,
  `media-src 'self' blob: ${SUPABASE} ${WISTIA}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SUPABASE} ${WISTIA} ${SENTRY}`,
  `frame-src 'self' ${WISTIA}`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Force HTTPS pendant 2 ans, sous-domaines inclus (préchargement HSTS).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Empêche le MIME-sniffing (défense XSS/upload).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Anti-clickjacking pour les navigateurs ne gérant pas frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Ne fuit pas l'URL complète vers les origines tierces.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Coupe les API sensibles du navigateur par défaut.
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  // Monorepo pnpm : fige la racine de traçage des fichiers (sinon Next remonte
  // jusqu'à un lockfile hors du projet et se trompe de racine).
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      // La zone parent s'ouvre sur le Bilan (onglet Résumé, façon Apple Forme)
      { source: '/parent', destination: '/parent/bilans', permanent: false },
      // Bibliothèque fusionnée dans l'onglet Fitness ; ancienne page Progrès retirée
      { source: '/parent/library', destination: '/parent/fitness', permanent: false },
      { source: '/parent/progress', destination: '/parent/bilans', permanent: false },
    ];
  },
};

// ── PWA (Serwist) ──
// Génère public/sw.js depuis src/sw.ts : précache du shell, cache runtime,
// fallback /offline, réception Web Push. Désactivé en dev (interfère avec HMR).
const withSerwist = require('@serwist/next').default({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

// ── Sentry ──
// Le wrap n'est actif que si le DSN est présent (env Vercel) : sans lui, le
// build reste strictement identique. L'upload des source maps exige en plus
// SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT (sinon il est sauté).
const { withSentryConfig } = require('@sentry/nextjs');

const configWithPwa = withSerwist(nextConfig);

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithPwa, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      disableLogger: true,
      widenClientFileUpload: true,
    })
  : configWithPwa;
