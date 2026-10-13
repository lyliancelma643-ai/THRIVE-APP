/**
 * Tokens THRIVE iOS 27 — « Soir de famille », deux styles : `lin` (jour) et `veillee` (nuit).
 * Source de vérité : maquettes-ios27/final.css, blocs `[data-v="v4"] .phone` (Lin) et `[data-v="v5"] .phone`
 * (Veillée) + blocs « Matières ». Comparé à la feuille par canvasFidelity.test.ts.
 * Fichier en logique pure (aucun import react-native) pour rester testable.
 */

export type StyleKey = 'lin' | 'veillee';
export const STYLE_KEYS: readonly StyleKey[] = ['lin', 'veillee'] as const;
export const DEFAULT_STYLE: StyleKey = 'lin';

export const STYLE_LABELS: Record<StyleKey, string> = {
  lin: 'Lin',
  veillee: 'Veillée',
};

/** Sous-titres des tuiles-aperçus du sélecteur de style (écran X du canevas). */
export const STYLE_DESCRIPTIONS: Record<StyleKey, string> = {
  lin: 'Clair, papier et lin',
  veillee: 'Sombre, à la lampe',
};

export function isStyleKey(v: unknown): v is StyleKey {
  return v === 'lin' || v === 'veillee';
}

/** Identités communes aux deux styles (`[data-v="v4"],[data-v="v5"] .phone`). */
const brand = {
  accent: '#F9EB50',
  accentInk: '#022539',
  sage: '#A7C4BC',
  sageInk: '#46695F',
  linen: '#EFE9DD',
  paperInk: '#022539',
  paperInk2: '#33454F',
  paperSage: '#46695F',
  navy600: '#004E7A',
  navy900: '#022539',
  cream: '#F7F5F2',
  sun: '#F9EB50',
  // Couleurs système (liste de réglages) : gardées de la base iOS 27, utilisées par `ListRow iconColor`.
  sysYellow: '#FFCC00',
} as const;

const linColors = {
  ...brand,
  // — fonds —
  bgGrouped: '#F7F5F2',
  bgGrouped2: '#FFFEFB',
  bgGrouped3: '#EFEBE4',
  elev: '#FFFEFB',
  tab: '#FFFFFF',
  // — textes —
  label: '#022539',
  label2: '#4D5F69',
  label3: 'rgba(2,37,57,0.40)',
  label4: 'rgba(2,37,57,0.18)',
  // — filets et remplissages —
  separator: 'rgba(0,49,76,0.12)',
  sepOpaque: '#DDD7CF',
  fill: 'rgba(0,49,76,0.13)',
  fill2: 'rgba(0,49,76,0.09)',
  fill3: 'rgba(0,49,76,0.065)',
  fill4: 'rgba(0,49,76,0.04)',
  // — teinte —
  tint: '#004E7A',
  tintInk: '#F7F5F2',
  tintSoft: 'rgba(0,78,122,0.09)',
  tintText: '#004E7A',
  kid: '#46695F',
  kidText: '#46695F',
  ok: '#2E6B4F',
  warn: '#8A5A00',
  bad: '#B42318',
  sysRed: '#B42318',
  sysGreen: '#46695F',
  // — verre —
  glass: 'rgba(255,254,251,0.62)',
  glassStrong: 'rgba(255,254,251,0.86)',
  glassEdge: 'rgba(0,49,76,0.12)',
  glassSpec: 'rgba(255,255,255,0.95)',
  glassTint: 'rgba(0,78,122,0.92)',
  // — barre d'onglets, pastilles, interrupteur, étoile, bulles —
  navActive: '#004E7A',
  tabOn: 'rgba(0,78,122,0.11)',
  badgeBg: 'rgba(70,105,95,0.13)',
  badgeInk: '#46695F',
  okSoft: 'rgba(70,105,95,0.13)',
  tglOn: '#46695F',
  starGlow: 'rgba(249,235,80,0.75)',
  bubIn: '#EBE6DE',
  bubOut: '#004E7A',
  segOn: '#FFFEFB',
  // — sauge lisible en texte (étiquettes de section) —
  sageText: '#46695F',
  // — papier —
  paper: '#FFFEFB',
  // — couleurs système —
  sysOrange: '#FF9500',
  sysBlue: '#007AFF',
  sysIndigo: '#5856D6',
  sysTeal: '#30B0C7',
  sysMint: '#00C7BE',
  sysCyan: '#32ADE6',
  sysPurple: '#AF52DE',
  sysPink: '#FF2D55',
} as const;

const veilleeColors = {
  ...brand,
  bgGrouped: '#022539',
  bgGrouped2: '#00314C',
  bgGrouped3: '#0B3C59',
  elev: '#00314C',
  tab: 'rgba(0,49,76,0.74)',
  label: '#F7F5F2',
  label2: 'rgba(247,245,242,0.72)',
  label3: 'rgba(247,245,242,0.42)',
  label4: 'rgba(247,245,242,0.2)',
  separator: 'rgba(247,245,242,0.12)',
  sepOpaque: '#17475F',
  fill: 'rgba(247,245,242,0.17)',
  fill2: 'rgba(247,245,242,0.13)',
  fill3: 'rgba(247,245,242,0.095)',
  fill4: 'rgba(247,245,242,0.06)',
  tint: '#F9EB50',
  tintInk: '#022539',
  tintSoft: 'rgba(249,235,80,0.14)',
  tintText: '#CFE3DC',
  kid: '#A7C4BC',
  kidText: '#A7C4BC',
  ok: '#A7D8BE',
  warn: '#FFB340',
  bad: '#FF9A92',
  sysRed: '#FF9A92',
  sysGreen: '#A7C4BC',
  glass: 'rgba(11,60,89,0.55)',
  glassStrong: 'rgba(6,46,68,0.86)',
  glassEdge: 'rgba(247,245,242,0.15)',
  glassSpec: 'rgba(255,255,255,0.22)',
  glassTint: 'rgba(249,235,80,0.95)',
  navActive: '#A7C4BC',
  tabOn: 'rgba(167,196,188,0.11)',
  badgeBg: 'rgba(167,196,188,0.16)',
  badgeInk: '#A7C4BC',
  okSoft: 'rgba(167,196,188,0.16)',
  tglOn: '#A7C4BC',
  starGlow: 'rgba(249,235,80,0.5)',
  bubIn: '#0E4260',
  bubOut: '#123F55',
  segOn: 'rgba(247,245,242,0.16)',
  sageText: '#A7C4BC',
  paper: '#F7F5F2',
  sysOrange: '#FF9F0A',
  sysBlue: '#0A84FF',
  sysIndigo: '#5E5CE6',
  sysTeal: '#40C8E0',
  sysMint: '#63E6E2',
  sysCyan: '#64D2FF',
  sysPurple: '#BF5AF2',
  sysPink: '#FF375F',
} as const;

export type ColorTokens = { -readonly [K in keyof typeof linColors]: string };

export const COLORS: Record<StyleKey, ColorTokens> = {
  lin: linColors,
  veillee: veilleeColors,
};

/**
 * Matières (blocs « Matières » de final.css). Les couleurs sont les mêmes dans les deux styles, sauf
 * le papier (`--paper`) qui reste un papier clair en Veillée : l'encre y est TOUJOURS marine.
 */
export const MATERIALS = {
  /** `.paper` : encre et filets du papier vélin / vergé (surchargent `--label…` dans le sous-arbre). */
  paper: {
    ink: '#022539', ink2: '#33454F', ink3: 'rgba(2,37,57,0.4)', sep: 'rgba(0,49,76,0.12)',
    sage: '#46695F', tintText: '#004E7A', fill3: 'rgba(0,49,76,0.065)',
    frame: 'rgba(70,105,95,0.45)', frameInner: 'rgba(70,105,95,0.25)', frameInset: 7,
    shadow: { color: '#000000', opacity: 0.32, radius: 14, offsetY: 12 },
  },
  /** `.felt` / `.felt-strong` : fond marine feutré (le jour) ; texture `felt` ou `felt-strong`. */
  felt: { color: '#004E7A', ink: '#F7F5F2', veilleeColor: '#0B3C59', veilleeEdge: 'rgba(247,245,242,0.22)' },
  /** `.velvet` : velours côtelé de la semaine (mêmes valeurs dans les deux styles). */
  velvet: {
    color: '#00314C', ink: '#F7F5F2', ink2: 'rgba(247,245,242,0.84)', ink3: 'rgba(247,245,242,0.66)',
    sep: 'rgba(247,245,242,0.18)', fill: 'rgba(247,245,242,0.2)', fill3: 'rgba(247,245,242,0.12)', tint: '#F9EB50',
    tintInk: '#022539',
  },
  /** `.enamel` : le seul geste jaune de l'écran. */
  enamel: {
    color: '#F9EB50', ink: '#022539', highlight: '#FDF7A0', mid: '#F9EB50', low: '#E9D93C',
    shadow: { color: '#F9EB50', opacity: 0.55 },
  },
  /** `.star-on` / `.star-off`. */
  star: {
    onHigh: '#FFFBD0', onMid: '#F9EB50', onLow: '#D8C72E', onInk: '#022539',
    offInk: 'rgba(247,245,242,0.42)', offFill: 'rgba(0,0,0,0.14)',
  },
  /** `.arch` : passe-partout de lin autour de la fenêtre de la mascotte. */
  arch: {
    color: '#EFE9DD', inner: '#F3EFE6', innerEdge: 'rgba(2,37,57,0.12)',
    sizes: {
      md: { padding: 10, bottomRadius: 28, innerBottomRadius: 19 },
      sm: { padding: 7, bottomRadius: 20, innerBottomRadius: 14 },
      xs: { padding: 5, bottomRadius: 14, innerBottomRadius: 10 },
    },
    /** Rayon vertical des deux coins hauts : 44,8 % du cadre (44 % pour la fenêtre). */
    topRadiusRatio: 0.448,
    innerTopRadiusRatio: 0.44,
  },
} as const;

/**
 * Styles de texte du canevas (classes `.t-*`, px = pt en RN). `weight` choisit la famille chargée.
 * Les noms Apple (largeTitle, subheadline, footnote, caption1/2) restent des alias des noms du canevas.
 * Les titres éditoriaux (grand titre, title1-3, titre de section, titre de barre) sont en Fraunces dans
 * les deux styles ; tout le reste est en Inter.
 */
export type TextStyleName =
  | 'largetitle' | 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'callout'
  | 'sub' | 'subheadline' | 'foot' | 'footnote' | 'cap' | 'caption1' | 'cap2' | 'caption2'
  | 'sectionTitle' | 'navTitle' | 'eyebrow' | 'kick' | 'numeralHero' | 'displayLarge' | 'displayQuote';

export type TextSpec = {
  fontSize: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700 | 800;
  letterSpacing?: number;
  /** `display` = Fraunces (titres, « 0 $ »). */
  family?: 'sans' | 'display';
  /** Capitales (étiquettes `.eyebrow`, `.kick`). */
  uppercase?: boolean;
};

// Fraunces : l'axe SOFT 100 du canevas n'existe pas en RN → instance statique 500 (grands titres) / 600 (petits).
const LARGE_TITLE: TextSpec = { fontSize: 36, lineHeight: 42, weight: 500, letterSpacing: -0.4, family: 'display' };
const TITLE1: TextSpec = { fontSize: 30, lineHeight: 36, weight: 500, letterSpacing: -0.3, family: 'display' };
const TITLE2: TextSpec = { fontSize: 24, lineHeight: 30, weight: 500, letterSpacing: -0.2, family: 'display' };
const SUB: TextSpec = { fontSize: 15, lineHeight: 20, weight: 400, letterSpacing: -0.23 };
const FOOT: TextSpec = { fontSize: 13, lineHeight: 18, weight: 400, letterSpacing: -0.08 };
const CAP: TextSpec = { fontSize: 12, lineHeight: 16, weight: 400, letterSpacing: 0 };
const CAP2: TextSpec = { fontSize: 11, lineHeight: 13, weight: 600, letterSpacing: 0.06 };

export const TYPE: Record<TextStyleName, TextSpec> = {
  largetitle: LARGE_TITLE,
  largeTitle: LARGE_TITLE,
  title1: TITLE1,
  title2: TITLE2,
  title3: { fontSize: 20, lineHeight: 25, weight: 600, letterSpacing: -0.1, family: 'display' },
  headline: { fontSize: 17, lineHeight: 22, weight: 600, letterSpacing: -0.43 },
  body: { fontSize: 17, lineHeight: 22, weight: 400, letterSpacing: -0.43 },
  callout: { fontSize: 16, lineHeight: 21, weight: 400, letterSpacing: -0.31 },
  sub: SUB,
  subheadline: SUB,
  foot: FOOT,
  footnote: FOOT,
  cap: CAP,
  caption1: CAP,
  cap2: CAP2,
  caption2: CAP2,
  /** `.sec-h h4` : titre de section. */
  sectionTitle: { fontSize: 22, lineHeight: 28, weight: 600, letterSpacing: -0.15, family: 'display' },
  /** `.navbar .bar .ttl` : titre de la barre de navigation. */
  navTitle: { fontSize: 17, lineHeight: 22, weight: 600, letterSpacing: -0.1, family: 'display' },
  /** `.eyebrow`, `.sec-h.small h4` : capitales espacées (sauge). */
  eyebrow: { fontSize: 12, lineHeight: 16, weight: 700, letterSpacing: 1.44, uppercase: true },
  /** `.card .kick`. */
  kick: { fontSize: 11.5, lineHeight: 16, weight: 700, letterSpacing: 1.15, uppercase: true },
  /** « 0 $ » de l'essai gratuit : Fraunces. */
  numeralHero: { fontSize: 64, lineHeight: 64, weight: 600, family: 'display' },
  displayLarge: LARGE_TITLE,
  displayQuote: { fontSize: 20, lineHeight: 26, weight: 500, family: 'display' },
};

/** Style de texte effectif. Identique dans les deux styles ; `_style` n'est conservé que pour la compatibilité d'appel. */
export function typeSpec(name: TextStyleName, _style?: unknown): TextSpec {
  return TYPE[name];
}

/** Noms de familles chargées par expo-font (cf. fonts.ts). Fraunces : 400 / 500 / 600 seulement. */
export const FONT_FAMILIES = {
  sans: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
    800: 'Inter_800ExtraBold',
  },
  display: {
    400: 'Fraunces_400Regular',
    500: 'Fraunces_500Medium',
    600: 'Fraunces_600SemiBold',
    700: 'Fraunces_600SemiBold',
    800: 'Fraunces_600SemiBold',
  },
} as const;

/**
 * Géométrie propre à chaque style (`--card-r`, `--row-r`, `--display*`, `--shadow-card`, `--lamp`).
 * Lin et Veillée partagent les mesures ; seuls l'ombre et le halo de lampe diffèrent.
 */
export type StyleMetrics = {
  cardRadius: number;
  rowRadius: number;
  displayFamily: 'display';
  displayWeight: 500;
  displayTrack: number;
  largeTitleSize: number;
  largeTitleLine: number;
  /** Ombre portée des cartes et listes (`--shadow-card`). */
  cardShadow: true;
  /** Halo de lampe (`--lamp`) : ellipse soleil en haut de l'écran. */
  lamp: { alpha: number; radiusX: number; radiusY: number; centerY: number; fade: number };
};

const BASE_METRICS = {
  cardRadius: 26,
  rowRadius: 26,
  displayFamily: 'display',
  displayWeight: 500,
  displayTrack: -0.3,
  largeTitleSize: 36,
  largeTitleLine: 42,
  cardShadow: true,
} as const;

export const STYLE_METRICS: Record<StyleKey, StyleMetrics> = {
  lin: { ...BASE_METRICS, lamp: { alpha: 0.34, radiusX: 1.2, radiusY: 0.52, centerY: -0.08, fade: 0.62 } },
  veillee: { ...BASE_METRICS, lamp: { alpha: 0.17, radiusX: 1.2, radiusY: 0.55, centerY: -0.06, fade: 0.62 } },
};

/** Constantes du canevas qui ne changent pas d'un style à l'autre (`#fff` des pastilles, pouce du slider…). */
export const CANVAS = {
  white: '#ffffff',
  thumbFill: 'rgba(255,255,255,0.55)',
  thumbEdge: 'rgba(0,0,0,0.08)',
  thumbSpec: 'rgba(255,255,255,0.95)',
  tintedEdge: 'rgba(0,0,0,0.18)',
  tintedSpec: 'rgba(255,255,255,0.45)',
  promEdge: 'rgba(0,0,0,0.08)',
  promSpec: 'rgba(255,255,255,0.28)',
  dim: 'rgba(0,0,0,0.28)',
  /** Médaillon de la mascotte (`radial-gradient` crème, identique dans les deux styles). */
  medallion: { c0: '#F6F2EA', c1: '#EEE8DD', c2: '#E4DCCD', shadow: 'rgba(120,100,70,0.10)', ring: 'rgba(255,255,255,0.55)', ring2: 'rgba(255,255,255,0.10)' },
} as const;

/** Applique une opacité à une couleur `#rrggbb`, `#rgb` ou `rgba(r,g,b,a)` (équivalent de `color-mix(… x%, transparent)`). */
export function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(c);
  if (rgba) {
    const a = rgba[4] === undefined ? 1 : parseFloat(rgba[4]);
    return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${+(a * alpha).toFixed(3)})`;
  }
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${+alpha.toFixed(3)})`;
}

export const SPACING = {
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 22,
  space6: 25,
  space8: 34,
  touchMin: 44,
  rowMin: 52,
  tabbarH: 62,
} as const;

export const RADIUS = {
  chip: 12,
  tile: 18,
  card: 26,
  sheet: 38,
  sheetFloat: 46,
  full: 9999,
} as const;

/**
 * `--shadow-card` en ombre RN (RN ne gère ni l'étalement négatif ni l'ombre interne : opacité réduite
 * et décalage Y pour retrouver l'ombre « longue et basse » de la maquette).
 */
export const SHADOW_CARD = {
  lin: { shadowColor: '#00314C', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  veillee: { shadowColor: '#000000', shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
} as const;

export const SHADOW_THUMB = {
  shadowColor: '#000000',
  shadowOpacity: 0.18,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
} as const;

export type Tokens = {
  style: StyleKey;
  isDark: boolean;
  colors: ColorTokens;
  metrics: StyleMetrics;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  type: typeof TYPE;
};

export function getTokens(style: StyleKey): Tokens {
  return {
    style,
    isDark: style === 'veillee',
    colors: COLORS[style],
    metrics: STYLE_METRICS[style],
    spacing: SPACING,
    radius: RADIUS,
    type: TYPE,
  };
}
