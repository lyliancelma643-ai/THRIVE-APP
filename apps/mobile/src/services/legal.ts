// Liens légaux et de support de l'app mobile.
//
// Exigés par Apple (5.1.1(i), 3.1.2) et Google Play (politique Données
// utilisateur) : la politique de confidentialité doit être accessible DANS
// l'app, et les conditions sur tout écran d'abonnement. Les URL viennent de
// l'environnement (EXPO_PUBLIC_*) pour rester identiques à celles saisies dans
// App Store Connect et la Play Console.
// Source unique : theme.ts (paywall) et AccountPrivacySection (profil) lisent ces URL.
export const LEGAL = {
  // Pages publiques de la web app (docs/conformite-stores/ pour leur texte).
  terms: process.env.EXPO_PUBLIC_TERMS_URL || 'https://app.thrivesportpositive.com/conditions',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://app.thrivesportpositive.com/confidentialite',
  support: process.env.EXPO_PUBLIC_SUPPORT_URL || 'https://app.thrivesportpositive.com/support',
} as const;

// Version des textes acceptés à l'inscription : à incrémenter à chaque
// changement de fond de la politique ou des conditions (preuve de consentement).
export const LEGAL_VERSION = '2026-10';
