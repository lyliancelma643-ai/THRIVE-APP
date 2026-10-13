// Couleurs de MARQUE reprises du canevas Claude Design (pas des couleurs de thème : identiques dans les 3 styles).
// Stripe, Apple Pay et l'étiquette « Phare » ont des teintes imposées par leur identité ; tout le reste passe par useTheme().
export const BRAND = {
  /** Pastille « S » de Stripe. */
  stripe: '#635BFF',
  /** Pastille et bouton Apple Pay. */
  applePay: '#000000',
  /** Étiquette « Phare » (ambre) : fond et texte. */
  phareBg: '#FFE7B8',
  phareInk: '#5A3A00',
  /** Fond crème des vignettes de programmes (hero de Y2). */
  packshot: '#F1EEE8',
} as const;
