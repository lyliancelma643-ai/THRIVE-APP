// Liens légaux et de support de l'app mobile.
//
// Exigés par Apple (5.1.1(i), 3.1.2) et Google Play (politique Données
// utilisateur) : la politique de confidentialité doit être accessible DANS
// l'app, et les conditions sur tout écran d'abonnement. Les URL viennent de
// l'environnement (EXPO_PUBLIC_*) pour rester identiques à celles saisies dans
// App Store Connect et la Play Console.
export const LEGAL = {
  // Sans URL propre, le contrat de licence standard d'Apple (EULA) s'applique sur iOS.
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL || '',
  support: process.env.EXPO_PUBLIC_SUPPORT_URL || '',
} as const;

// Version des textes acceptés à l'inscription : à incrémenter à chaque
// changement de fond de la politique ou des conditions (preuve de consentement).
export const LEGAL_VERSION = '2026-10-draft';
