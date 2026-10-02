import { isLegalEntityComplete, LEGAL_VERSION_DATE } from './legal-entity';

// Liens légaux de l'inscription et de l'offre d'abonnement. Par défaut, les
// pages de l'app (/legal/*) ; une URL externe (site vitrine) peut les remplacer.
// Les liens n'apparaissent que si l'identité légale est configurée : on ne
// renvoie jamais vers un document où manque le responsable (Loi 25, art. 3.2).
const ready = isLegalEntityComplete();

export const LEGAL_LINKS = {
  terms: process.env.NEXT_PUBLIC_TERMS_URL || (ready ? '/legal/conditions' : ''),
  privacy: process.env.NEXT_PUBLIC_PRIVACY_URL || (ready ? '/legal/confidentialite' : ''),
} as const;

/** Consentements enregistrés à l'inscription (table consents, version datée). */
export const SIGNUP_CONSENTS = ['terms', 'privacy', 'minor_sensitive_data'] as const;
export const CONSENT_POLICY_VERSION = LEGAL_VERSION_DATE;
