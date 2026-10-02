// Identité publiée dans les CGU (/cgu), la politique de confidentialité
// (/confidentialite) et la page Compte. Tout est dans le code : aucune
// variable d'environnement n'est nécessaire, l'app est complète dès le build.
//
// Seuls des faits vérifiables figurent ici. Raison sociale, NEQ et adresse
// postale ne sont pas connus du dépôt : laissés vides, ils ne s'affichent pas
// (aucune valeur inventée). Les renseigner ici le jour venu suffit.

export const LEGAL_ENTITY = {
  /** Nom commercial présenté aux clients. */
  brand: 'THRIVE Sport Positive',
  /** Raison sociale exacte (ex. « 9999-9999 Québec inc. ») — affichée si renseignée. */
  legalName: '',
  /** Numéro d'entreprise du Québec — affiché si renseigné. */
  neq: '',
  /** Adresse postale du siège — affichée si renseignée. */
  address: '',
  /** Site vitrine et application (domaines déjà utilisés par le code). */
  siteUrl: 'https://thrivesportpositive.com',
  appUrl: 'https://app.thrivesportpositive.com',
} as const;

// Loi 25 (art. 3.1) : à défaut de délégation écrite, la personne ayant la plus
// haute autorité au sein de l'entreprise exerce la fonction de responsable de
// la protection des renseignements personnels. Canal de contact garanti :
// la conversation « Support THRIVE » de l'app, ouverte à tous les parents.
export const PRIVACY_CONTACT = {
  officer: '',
  title: 'Responsable de la protection des renseignements personnels',
  /** Courriel dédié — affiché si renseigné ; sinon le support intégré fait foi. */
  email: '',
  channel: 'la conversation « Support THRIVE » de la messagerie de l’app',
} as const;

/** Date d'entrée en vigueur des documents légaux (à changer à chaque révision). */
export const LEGAL_VERSION_DATE = '2026-10-02';
