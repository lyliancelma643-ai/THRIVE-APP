// Drapeau du bloc « programmes » (Groupe / Individuel / Complet) dans l'app mobile.
// Faux par défaut : tant que Lylian n'a pas tranché Apple 3.1.3(d)/(e) (GO 3, §7-R1),
// rien de ce qui touche aux programmes (offres, paiement, appel, mention de Stripe)
// n'est rendu. Lecture directe de process.env : Expo n'inline que cette forme.
export const OFFRES_PROGRAMMES_IN_APP: boolean = process.env.EXPO_PUBLIC_OFFRES_PROGRAMMES_IN_APP === 'true';
