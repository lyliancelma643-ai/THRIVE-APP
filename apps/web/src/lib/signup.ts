// Constantes partagées entre l'inscription (/login) et l'ajout de profil
// (/parent/select-profile).

/** Consentement donné à l'inscription (table consents, Loi 25). */
export const CONSENT_PURPOSE = 'privacy_policy_child_data';
/** Version de la page /confidentialite acceptée. À changer si le texte change. */
export const PRIVACY_VERSION = '2026-10';

/**
 * Enfants déclarés à l'inscription mais non enregistrés (quota du forfait,
 * erreur réseau…) : l'écran d'ajout de profil les reprend avec un message.
 */
export const SIGNUP_MISSED_KEY = 'thrive_signup_missed_children';
export type SignupMissed = { names: string[]; quota: boolean };
