// Liens légaux affichés à l'inscription et sur l'offre d'abonnement (Loi 25,
// protection du consommateur, règles des stores). Documents hébergés sur le
// site vitrine : URL fournies par l'environnement, rien d'inventé ici. Tant
// qu'une URL manque, le lien correspondant n'est simplement pas affiché.
export const LEGAL_LINKS = {
  terms: process.env.NEXT_PUBLIC_TERMS_URL || '',
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL || '',
} as const;
