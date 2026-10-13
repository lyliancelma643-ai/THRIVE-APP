// Couleurs de MARQUE reprises du canevas Claude Design (pas des couleurs de thème : identiques en Lin et en Veillée).
// Stripe, Apple Pay et l'étiquette « Phare » ont des teintes imposées par leur identité ; tout le reste passe par useTheme().
export const BRAND = {
  /** Pastille « S » de Stripe. */
  stripe: '#635BFF',
  /** Pastille et bouton Apple Pay. */
  applePay: '#000000',
  /** Étiquette « Phare » (ambre) : fond et texte. */
  phareBg: '#FFE7B8',
  phareInk: '#5A3A00',
  /** Fond clair des vignettes de programmes (haut de Y2, derrière l’image). */
  packshot: '#F1EEE8',
} as const;
