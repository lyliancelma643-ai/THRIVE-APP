import { PACKS_URL } from './program-packs';

// Actions des onglets verrouillés (Bilan / Mes séances) — module pur, testé.
// Jamais de paiement ; dans l'app native, rien vers le site des packs.

const VIDEO_URL_CONFIGURED = process.env.NEXT_PUBLIC_PROGRAM_VIDEO_URL || null;
/** Vidéo de présentation du programme (~5 min) ; sur le web seul, à défaut, la page des packs. */
export const PROGRAM_VIDEO_URL = VIDEO_URL_CONFIGURED || PACKS_URL;
/** Prise de rendez-vous de 15 min avec un coach ; à défaut, la messagerie THRIVE. */
export const COACH_CALL_URL = process.env.NEXT_PUBLIC_COACH_CALL_URL || '/parent/messages';

/** URL de la vidéo à afficher, ou null (app native sans page vidéo dédiée). */
export function programVideoUrl(native: boolean): string | null {
  return native ? VIDEO_URL_CONFIGURED : PROGRAM_VIDEO_URL;
}

