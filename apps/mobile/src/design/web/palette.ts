/**
 * Jetons de l'espace parent du WEB (apps/web/src/app/globals.css), portés tels quels dans l'app :
 * « Nuit calme » (`[data-theme='night']`) et « Jour clair » (`[data-theme='day']`), plus la surface Maison
 * (`[data-surface='maison']`, direction « Soir de famille »). Logique pure (aucun import react-native).
 *
 * Correspondance des styles de l'app : Veillée (sombre, à la lampe) ↔ Nuit calme ; Lin (clair, papier) ↔ Jour clair.
 * Le style reste choisi au même endroit (Compte, ou le rond soleil/lune de l'en-tête) : un seul réglage pour toute l'app.
 */
import type { StyleKey } from '../tokens';

export type Ambiance = 'night' | 'day';
export type WebSurface = 'base' | 'maison';

export function ambianceFor(style: StyleKey): Ambiance {
  return style === 'veillee' ? 'night' : 'day';
}

export type WebPalette = {
  ambiance: Ambiance;
  surfaceKind: WebSurface;
  bg: string;
  surface: string;
  surfaceSub: string;
  tab: string;
  text: string;
  text2: string;
  text3: string;
  text4: string;
  line: string;
  line2: string;
  track: string;
  accent: string;
  accentInk: string;
  onAccent: string;
  accentLine: string;
  lockBg: string;
  lockLine: string;
  navActive: string;
  sage: string;
  onSage: string;
  sageInk: string;
  brand: string;
  chip: string;
  field: string;
  meta: string;
  dangerInk: string;
  warnInk: string;
  /** `--shadow` (aucune en Nuit calme de base) : opacité de l'ombre longue des cartes. */
  shadowOpacity: number;
  /** Maison : fond de l'arche, papier, encre du papier, lueur des étoiles, lampe. */
  arch: string;
  paper: string;
  paperInk: string;
  starGlow: string;
  lampAlpha: number;
};

const NIGHT: WebPalette = {
  ambiance: 'night',
  surfaceKind: 'base',
  bg: '#06161E',
  surface: '#0C2029',
  surfaceSub: 'rgba(255,255,255,0.03)',
  tab: '#0A1C24',
  text: '#F7F5F2',
  text2: 'rgba(234,243,241,0.86)',
  text3: 'rgba(234,243,241,0.68)',
  text4: 'rgba(234,243,241,0.52)',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.16)',
  track: 'rgba(255,255,255,0.09)',
  accent: '#F9EB50',
  accentInk: '#F9EB50',
  onAccent: '#022539',
  accentLine: 'rgba(249,235,80,0.3)',
  lockBg: 'rgba(249,235,80,0.07)',
  lockLine: 'rgba(249,235,80,0.28)',
  navActive: '#F9EB50',
  sage: '#A7C4BC',
  onSage: '#06222A',
  sageInk: '#A7C4BC',
  brand: '#0E6593',
  chip: 'rgba(255,255,255,0.07)',
  field: 'rgba(255,255,255,0.06)',
  meta: 'rgba(234,243,241,0.64)',
  dangerInk: '#FCA5A5',
  warnInk: '#E0B45A',
  shadowOpacity: 0,
  arch: '#F7F5F2',
  paper: '#F7F5F2',
  paperInk: '#46695F',
  starGlow: 'rgba(249,235,80,0.5)',
  lampAlpha: 0.17,
};

const DAY: WebPalette = {
  ambiance: 'day',
  surfaceKind: 'base',
  bg: '#F2EFE9',
  surface: '#FFFFFF',
  surfaceSub: 'rgba(0,49,76,0.045)',
  tab: '#FFFFFF',
  text: '#022539',
  text2: '#3C4A52',
  text3: '#5B6A73',
  text4: '#56626B',
  line: 'rgba(0,49,76,0.1)',
  line2: 'rgba(0,49,76,0.16)',
  track: '#E3DFD8',
  accent: '#F9EB50',
  accentInk: '#004E7A',
  onAccent: '#022539',
  accentLine: 'rgba(0,78,122,0.26)',
  lockBg: 'rgba(0,78,122,0.05)',
  lockLine: 'rgba(0,78,122,0.18)',
  navActive: '#004E7A',
  sage: '#7FA197',
  onSage: '#FFFFFF',
  sageInk: '#46695F',
  brand: '#004E7A',
  chip: 'rgba(0,49,76,0.07)',
  field: '#FFFFFF',
  meta: '#56626B',
  dangerInk: '#991B1B',
  warnInk: '#8A5A00',
  shadowOpacity: 0.07,
  arch: '#C9DCD6',
  paper: '#FFFEFB',
  paperInk: '#46695F',
  starGlow: 'rgba(249,235,80,0.75)',
  lampAlpha: 0.34,
};

/** `[data-theme='night'] [data-surface='maison']` */
const MAISON_NIGHT: WebPalette = {
  ...NIGHT,
  surfaceKind: 'maison',
  bg: '#022539',
  surface: '#00314C',
  surfaceSub: 'rgba(247,245,242,0.05)',
  tab: 'rgba(0,49,76,0.74)',
  text: '#F7F5F2',
  text2: 'rgba(247,245,242,0.84)',
  text3: 'rgba(247,245,242,0.68)',
  text4: 'rgba(247,245,242,0.54)',
  meta: 'rgba(247,245,242,0.64)',
  line: 'rgba(247,245,242,0.1)',
  line2: 'rgba(247,245,242,0.18)',
  track: 'rgba(247,245,242,0.1)',
  chip: 'rgba(247,245,242,0.07)',
  field: 'rgba(247,245,242,0.06)',
  shadowOpacity: 0.55,
};

/** `[data-theme='day'] [data-surface='maison']` */
const MAISON_DAY: WebPalette = {
  ...DAY,
  surfaceKind: 'maison',
  bg: '#F7F5F2',
  surface: '#FFFEFB',
  shadowOpacity: 0.35,
};

export const WEB_PALETTES: Record<Ambiance, Record<WebSurface, WebPalette>> = {
  night: { base: NIGHT, maison: MAISON_NIGHT },
  day: { base: DAY, maison: MAISON_DAY },
};

export function webPalette(style: StyleKey, surface: WebSurface = 'base'): WebPalette {
  return WEB_PALETTES[ambianceFor(style)][surface];
}

/** Papier (`.maison-paper`) : encres marine quelle que soit l'ambiance. */
export const PAPER_INKS = {
  text: '#022539',
  text2: '#33454F',
  text3: '#56626B',
  line: 'rgba(0,49,76,0.12)',
  line2: 'rgba(0,49,76,0.2)',
  accentInk: '#004E7A',
} as const;

/** Teinte de la charte par pilier (Poster.tsx du web). */
export const PILLAR_HUE: Record<string, string> = {
  P1: '#3380AC',
  P2: '#A7C4BC',
  P3: '#F9EB50',
  P4: '#67A4C9',
  P5: '#C9DCD6',
  P6: '#7FA197',
  P7: '#9CC4DD',
  P8: '#F7F5F2',
};
