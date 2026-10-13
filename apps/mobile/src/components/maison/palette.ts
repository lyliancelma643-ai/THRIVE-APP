import { withAlpha, useTheme, type StyleKey } from '../../design';

/**
 * Palettes propres aux écrans Maison du canevas Claude Design.
 *
 * L'écran K (accueil) n'utilise pas les fonds « inset grouped » du style : le canevas le peint en lin
 * (#F7F5F2, cartes papier) en Natif et en Carnet, et en marine (#022539, cartes #00314C) en Nuit calme.
 * L'écran M (moment en cours) est une scène sombre plein écran dont le fond change selon le style
 * (#0B2233 / #000 / #022539). Ces valeurs sont des constantes du canevas, centralisées ici — les écrans
 * ne contiennent aucune couleur en dur. Tout ce qui a un jeton (navy900, cream, sun, sage…) le reprend.
 */
export type HomePalette = {
  bg: string;
  ink: string;
  /** Texte courant sous le titre (callout). */
  body: string;
  muted: string;
  card: string;
  cardBorder: string;
  cardShadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  /** Couleur des liens et icônes de section (sauge). */
  link: string;
  badgeBg: string;
  chipBg: string;
  chipBorder: string;
  chipInk: string;
  chipOnBg: string;
  chipOnInk: string;
  glassBg: string;
  glassBorder: string;
  glassInk: string;
  /** Capsule sur l'image (« Recommandé pour … »). */
  capsuleBg: string;
  capsuleBorder: string;
  capsuleInk: string;
  /** Bandeau du haut (inclus / essai). */
  bannerBg: string;
  bannerBorder: string;
  bannerInk: string;
  /** Voile de dégradé en haut de l'affiche. */
  heroTopVeil: string;
  heroBlurOpacity: number;
  counterBg: string;
  counterInk: string;
  paper: string;
  paperInk: string;
  paperAccent: string;
  rule: string;
  soonBg: string;
  soonInk: string;
};

const NAVY = '#022539';
const CREAM = '#F7F5F2';

export const HOME_PALETTES: Record<StyleKey, HomePalette> = {
  natif: {
    bg: CREAM, ink: NAVY, body: '#33454F', muted: '#56626B', card: '#FFFEFB', cardBorder: 'rgba(0,49,76,0.12)',
    cardShadow: { shadowColor: '#00314C', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
    link: '#46695F', badgeBg: 'rgba(167,196,188,0.15)',
    chipBg: 'rgba(0,49,76,0.06)', chipBorder: 'rgba(0,49,76,0.12)', chipInk: NAVY, chipOnBg: NAVY, chipOnInk: CREAM,
    glassBg: 'rgba(255,255,255,0.7)', glassBorder: 'rgba(0,49,76,0.20)', glassInk: NAVY,
    capsuleBg: 'rgba(255,255,255,0.7)', capsuleBorder: 'rgba(2,37,57,0.10)', capsuleInk: '#46695F',
    bannerBg: 'rgba(255,255,255,0.66)', bannerBorder: 'rgba(2,37,57,0.10)', bannerInk: '#46695F',
    heroTopVeil: 'rgba(247,245,242,0.35)', heroBlurOpacity: 0.9,
    counterBg: '#00314C', counterInk: CREAM, paper: '#FFFEFB', paperInk: NAVY, paperAccent: '#46695F',
    rule: 'rgba(0,49,76,0.12)', soonBg: '#FFE7B8', soonInk: '#5A3A00',
  },
  nuit: {
    bg: NAVY, ink: CREAM, body: 'rgba(247,245,242,0.84)', muted: 'rgba(247,245,242,0.68)', card: '#00314C',
    cardBorder: 'rgba(247,245,242,0.10)',
    cardShadow: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
    link: '#A7C4BC', badgeBg: 'rgba(167,196,188,0.15)',
    chipBg: 'rgba(247,245,242,0.07)', chipBorder: 'rgba(247,245,242,0.10)', chipInk: CREAM, chipOnBg: CREAM, chipOnInk: NAVY,
    glassBg: 'rgba(247,245,242,0.10)', glassBorder: 'rgba(247,245,242,0.18)', glassInk: CREAM,
    capsuleBg: 'rgba(247,245,242,0.12)', capsuleBorder: 'rgba(255,255,255,0.20)', capsuleInk: '#A7C4BC',
    bannerBg: 'rgba(2,37,57,0.55)', bannerBorder: 'rgba(255,255,255,0.18)', bannerInk: '#F9EB50',
    heroTopVeil: 'rgba(2,37,57,0.55)', heroBlurOpacity: 0.55,
    counterBg: '#00314C', counterInk: CREAM, paper: CREAM, paperInk: NAVY, paperAccent: '#46695F',
    rule: 'rgba(247,245,242,0.10)', soonBg: '#FFE7B8', soonInk: '#5A3A00',
  },
  carnet: {
    bg: CREAM, ink: NAVY, body: '#33454F', muted: '#56626B', card: '#FFFEFB', cardBorder: 'rgba(0,49,76,0.12)',
    cardShadow: { shadowColor: '#00314C', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
    link: '#46695F', badgeBg: 'rgba(167,196,188,0.15)',
    chipBg: 'rgba(0,49,76,0.06)', chipBorder: 'rgba(0,49,76,0.12)', chipInk: NAVY, chipOnBg: NAVY, chipOnInk: CREAM,
    glassBg: 'rgba(255,255,255,0.7)', glassBorder: 'rgba(0,49,76,0.20)', glassInk: NAVY,
    capsuleBg: 'rgba(255,255,255,0.7)', capsuleBorder: 'rgba(2,37,57,0.10)', capsuleInk: '#46695F',
    bannerBg: 'rgba(255,255,255,0.66)', bannerBorder: 'rgba(2,37,57,0.10)', bannerInk: '#46695F',
    heroTopVeil: 'rgba(247,245,242,0.35)', heroBlurOpacity: 0.9,
    counterBg: '#00314C', counterInk: CREAM, paper: '#FFFEFB', paperInk: NAVY, paperAccent: '#46695F',
    rule: 'rgba(0,49,76,0.12)', soonBg: '#FFE7B8', soonInk: '#5A3A00',
  },
};

export function useHomePalette(): HomePalette & { style: StyleKey } {
  const { style } = useTheme();
  return { ...HOME_PALETTES[style], style };
}

/** Fond de la scène « Moment en cours » : Natif #0B2233, Nuit calme #000, Carnet #022539. */
export const MOMENT_BACKGROUND: Record<StyleKey, string> = { natif: '#0B2233', nuit: '#000000', carnet: '#022539' };

export function momentInk(alpha: number): string {
  return withAlpha('#FFFFFF', alpha);
}

/** Dégradé « soleil » des boutons et médaillons jaunes du canevas (radial en CSS, diagonal ici). */
export const SUN_GRADIENT = { button: ['#FDF7A0', '#F9EB50', '#E9D93C'], medal: ['#FFFBD0', '#F9EB50', '#D8C72E'] } as const;
/** Pastille d'étoile pas encore gagnée (compteur de la semaine). */
export const COUNTER_EMPTY = { bg: 'rgba(0,0,0,0.14)', ink: 'rgba(247,245,242,0.4)' } as const;
/** Lignes du feutre du compteur (rayures verticales du canevas). */
export const FELT_STRIPE = 'rgba(255,255,255,0.035)';
/** Papier du carnet : lignes horizontales discrètes. */
export const PAPER_RULE = 'rgba(2,37,57,0.04)';
/** Fond d'une vignette qui charge. */
export const POSTER_BG = '#F3EFE6';
