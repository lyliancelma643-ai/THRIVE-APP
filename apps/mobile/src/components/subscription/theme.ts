// Palette de l'app mobile (mêmes valeurs que les écrans parent existants).
export const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  body: '#cbd5e1',
  muted: '#94a3b8',
  faint: '#475569',
  accent: '#10b981',
  accentSoft: 'rgba(16,185,129,0.15)',
  accentText: '#6ee7b7',
  warn: '#fbbf24',
} as const;

// Liens légaux exigés par Apple et Google sur tout écran d'abonnement :
// pages publiques de l'app web (CGU = contrat de licence, politique de
// confidentialité). Aucune variable requise ; une URL d'environnement peut
// seulement les remplacer.
const APP_URL = 'https://app.thrivesportpositive.com';
export const LEGAL = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL || `${APP_URL}/cgu`,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || `${APP_URL}/confidentialite`,
} as const;
