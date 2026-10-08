import { Platform } from 'react-native';
import { legalLinks } from '../../services/subscription-logic';
import { LEGAL as LEGAL_URLS } from '../../services/legal';

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

// Liens légaux exigés par Apple (3.1.2) et Google sur tout écran d'abonnement.
// Conditions : sur iOS seulement, le contrat de licence standard d'Apple (EULA)
// sert de repli. La politique de confidentialité n'a PAS de repli : sans URL
// de confidentialité https valide (services/legal.ts), `LEGAL.complete` est faux et le paywall ne vend pas.
export const LEGAL = legalLinks(
  { terms: LEGAL_URLS.terms, privacy: LEGAL_URLS.privacy },
  Platform.OS,
);
