// Coordonnées publiques et versions des textes légaux — une seule source pour
// /support, /politique-confidentialite, le formulaire d'inscription et les
// fiches App Store / Google Play (URL de support et de confidentialité).
// Changer une valeur ici la change partout : ne rien coder en dur ailleurs.

export const LEGAL = {
  company: 'Thrive Sport Positive',
  city: 'Montréal (Québec), Canada',
  supportEmail: 'support@thrivesportpositive.com',
  privacyEmail: 'support@thrivesportpositive.com',
  // Loi 25 (LPRPSP, art. 3.1) : par défaut, la personne ayant la plus haute
  // autorité dans l'entreprise. Une délégation écrite permet d'en nommer une autre.
  privacyOfficerTitle: 'Fondateur, responsable de la protection des renseignements personnels',
  // Champs que seul le propriétaire connaît : marqués visiblement tant qu'ils
  // ne sont pas saisis. Ne jamais remplacer par une valeur inventée.
  privacyOfficerName: 'Lylian Celma',
  neq: '2281953960',
  address: '5006 rue Fabre, Montréal (Québec) H2J 3W4, Canada',
  responseDelay: '48 heures ouvrables',
  // Délai légal de réponse à une demande d'accès ou de rectification (art. 32).
  rightsDelayDays: 30,
  // Toute modification de fond de la politique change cette date (elle sert
  // aussi de `policy_version` dans public.consents).
  privacyPolicyVersion: '2026-10-02',
  siteUrl: 'https://app.thrivesportpositive.com',
} as const;

export const SUPPORT_PATH = '/support';
export const PRIVACY_PATH = '/politique-confidentialite';
export const TERMS_PATH = '/conditions';
// URL de suppression de compte déclarée à Google Play (section #suppression).
export const DELETION_PATH = '/politique-confidentialite#suppression';
