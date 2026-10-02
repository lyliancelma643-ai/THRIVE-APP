import { LEGAL_VERSION_DATE } from './legal-entity';

// Liens légaux de l'inscription, de l'offre d'abonnement et de la page Compte.
// Pages internes par défaut : l'app est autonome dès le build. Une URL externe
// (site vitrine) peut les remplacer, sans être nécessaire.
export const TERMS_PATH = '/cgu';
export const PRIVACY_PATH = '/confidentialite';
/** Ancre de la politique décrivant la suppression du compte (URL demandée par Google Play). */
export const ACCOUNT_DELETION_PATH = `${PRIVACY_PATH}#suppression`;

export const LEGAL_LINKS = {
  terms: process.env.NEXT_PUBLIC_TERMS_URL || TERMS_PATH,
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL || PRIVACY_PATH,
} as const;

/** Consentements enregistrés à l'inscription (table consents, version datée). */
export const SIGNUP_CONSENTS = ['terms', 'privacy', 'minor_sensitive_data'] as const;
export const CONSENT_POLICY_VERSION = LEGAL_VERSION_DATE;
