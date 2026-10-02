// Identité légale publiée dans les CGU, la politique de confidentialité et la
// page Compte. Loi 25 (art. 3.1 et 3.2) : le titre et les coordonnées du
// responsable de la protection des renseignements personnels doivent être
// publiés sur le site. Ces faits ne se devinent pas : ils viennent de
// l'environnement (Vercel → Environment Variables), jamais d'une valeur inventée.
//
// Tant qu'un champ obligatoire manque, les pages légales affichent
// « [à compléter] » et les liens légaux de l'inscription et de l'offre restent
// masqués (LegalNotice) : on ne publie pas un document incomplet.

const env = (v: string | undefined) => (v ?? '').trim();

export const LEGAL_ENTITY = {
  /** Raison sociale exacte (ex. « 9999-9999 Québec inc. », faisant affaire sous THRIVE Sport Positive). */
  name: env(process.env.NEXT_PUBLIC_LEGAL_NAME),
  /** Nom commercial affiché aux clients. */
  brand: env(process.env.NEXT_PUBLIC_LEGAL_BRAND) || 'THRIVE Sport Positive',
  /** Adresse postale du siège. */
  address: env(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  /** Numéro d'entreprise du Québec (NEQ), si l'entreprise est immatriculée. */
  neq: env(process.env.NEXT_PUBLIC_LEGAL_NEQ),
  /** Courriel du service client (questions sur l'abonnement, les CGU). */
  supportEmail: env(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
} as const;

export const PRIVACY_CONTACT = {
  /** Nom de la personne responsable de la protection des renseignements personnels. */
  officer: env(process.env.NEXT_PUBLIC_PRIVACY_OFFICER_NAME),
  /** Son titre (par défaut, la Loi 25 désigne la personne ayant la plus haute autorité). */
  title: env(process.env.NEXT_PUBLIC_PRIVACY_OFFICER_TITLE) || 'Responsable de la protection des renseignements personnels',
  email: env(process.env.NEXT_PUBLIC_PRIVACY_EMAIL),
} as const;

/** Date d'entrée en vigueur des documents légaux (à changer à chaque révision). */
export const LEGAL_VERSION_DATE = '2026-10-02';

export function missingLegalFields(): string[] {
  const missing: string[] = [];
  if (!LEGAL_ENTITY.name) missing.push('NEXT_PUBLIC_LEGAL_NAME');
  if (!LEGAL_ENTITY.address) missing.push('NEXT_PUBLIC_LEGAL_ADDRESS');
  if (!LEGAL_ENTITY.supportEmail) missing.push('NEXT_PUBLIC_SUPPORT_EMAIL');
  if (!PRIVACY_CONTACT.officer) missing.push('NEXT_PUBLIC_PRIVACY_OFFICER_NAME');
  if (!PRIVACY_CONTACT.email) missing.push('NEXT_PUBLIC_PRIVACY_EMAIL');
  return missing;
}

export const isLegalEntityComplete = () => missingLegalFields().length === 0;
