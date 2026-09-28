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

// Liens légaux exigés par Apple et Google sur tout écran d'abonnement.
// Conditions : si aucune URL propre n'est fournie, le contrat de licence
// standard d'Apple (EULA) s'applique sur iOS.
export const LEGAL = {
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || '',
} as const;
