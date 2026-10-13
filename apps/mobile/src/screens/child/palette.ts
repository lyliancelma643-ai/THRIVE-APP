import type { ThemeStyleKey } from '../../design';

/**
 * Palette ambrée du questionnaire de l'enfant (W) : l'interface de l'enfant a ses propres couleurs, identiques à
 * celles du canevas Claude Design et indépendantes du style de l'app, sauf clair / sombre (Lin = claire, Veillée = sombre).
 */
export type EpochPalette = {
  bg: string;
  ink: string;
  accent: string;
  card: string;
  /** Opacité de l'ombre chaude de la carte (jour seulement). */
  cardShadow: number;
  option: string;
  /** Encre sur la réponse choisie. */
  selectedInk: string;
  track: string;
  segTrack: string;
  segOn: string;
  segOnInk: string;
};

const DAY: EpochPalette = {
  bg: '#FFF4E2',
  ink: '#4A2A00',
  accent: '#C46A00',
  card: '#FFFBF3',
  cardShadow: 0.1,
  option: 'rgba(0,0,0,0.05)',
  selectedInk: '#FFFFFF',
  track: 'rgba(0,0,0,0.08)',
  segTrack: 'rgba(0,0,0,0.07)',
  segOn: '#FFFFFF',
  segOnInk: '#4A2A00',
};

// Sombre : le canevas pose du blanc sur l'ambre (#FFB340, contraste 1,9 : illisible) et garde des pistes noires sur fond
// brun ; on met l'encre brune du fond sur la réponse choisie et des pistes claires.
const NIGHT: EpochPalette = {
  bg: '#2A1A05',
  ink: '#FFE3B3',
  accent: '#FFB340',
  card: 'rgba(255,255,255,0.06)',
  cardShadow: 0,
  option: 'rgba(255,255,255,0.08)',
  selectedInk: '#2A1A05',
  track: 'rgba(255,255,255,0.12)',
  segTrack: 'rgba(255,255,255,0.08)',
  segOn: '#5A4220',
  segOnInk: '#FFE3B3',
};

export function epochPalette(styleKey: ThemeStyleKey): EpochPalette {
  return styleKey === 'veillee' ? NIGHT : DAY;
}
