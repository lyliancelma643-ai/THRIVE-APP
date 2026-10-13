/**
 * Tokens THRIVE iOS 27 — dérivés de docs/design/ios27-design-system/project/tokens.json.
 * Trois styles : `natif` (= thème "light"), `nuit` (= "dark"), `carnet` (= "creme").
 * Fichier en logique pure (aucun import react-native) pour rester testable.
 */

export type StyleKey = 'natif' | 'nuit' | 'carnet';
export const STYLE_KEYS: readonly StyleKey[] = ['natif', 'nuit', 'carnet'] as const;
export const DEFAULT_STYLE: StyleKey = 'natif';

export const STYLE_LABELS: Record<StyleKey, string> = {
  natif: 'Natif',
  nuit: 'Nuit calme',
  carnet: 'Carnet de saison',
};

export function isStyleKey(v: unknown): v is StyleKey {
  return v === 'natif' || v === 'nuit' || v === 'carnet';
}

const natifColors = {
  bgGrouped: "#f2f2f7",
  bgGrouped2: "#ffffff",
  bgGrouped3: "#f2f2f7",
  label: "#000000",
  label2: "rgba(60,60,67,0.74)",
  label3: "rgba(60,60,67,0.32)",
  separator: "rgba(60,60,67,0.24)",
  fill: "rgba(120,120,128,0.20)",
  fill3: "rgba(118,118,128,0.12)",
  tint: "#004e7a",
  tintInk: "#ffffff",
  accent: "#f9eb50",
  accentInk: "#1d1d1f",
  kid: "#1a7fbf",
  ok: "#248a3d",
  warn: "#a05a00",
  bad: "#c4211a",
  glass: "rgba(255,255,255,0.66)",
  glassStrong: "rgba(255,255,255,0.82)",
  glassEdge: "rgba(0,0,0,0.10)",
  glassSpec: "rgba(255,255,255,0.95)",
  navy600: "#004e7a",
  navy900: "#022539",
  cream: "#f7f5f2",
  sun: "#f9eb50",
  sage: "#a7c4bc",
  sageInk: "#46695f",
  sysGreen: "#34c759",
  sysRed: "#ff3b30",
  sysOrange: "#ff9500",
  sysBlue: "#007aff",
  sysIndigo: "#5856d6",
  sysTeal: "#30b0c7",
  // — Ajouts canevas Claude Design (feuille c8a22b05…) —
  elev: "#ffffff",
  label4: "rgba(60,60,67,0.18)",
  sepOpaque: "#c6c6c8",
  fill2: "rgba(120,120,128,0.16)",
  fill4: "rgba(116,116,128,0.08)",
  tintSoft: "rgba(0,78,122,0.10)",
  tintText: "#004e7a",
  kidText: "#0b6e99",
  okSoft: "rgba(52,199,89,0.16)",
  glassTint: "rgba(0,78,122,0.86)",
  bubIn: "#e9e9eb",
  segOn: "#ffffff",
  tabOn: "rgba(118,118,128,0.12)",
  sysYellow: "#ffcc00",
  sysMint: "#00c7be",
  sysCyan: "#32ade6",
  sysPurple: "#af52de",
  sysPink: "#ff2d55",
} as const;

const nuitColors = {
  bgGrouped: "#000000",
  bgGrouped2: "#1c1c1e",
  bgGrouped3: "#2c2c2e",
  label: "#ffffff",
  label2: "rgba(235,235,245,0.64)",
  label3: "rgba(235,235,245,0.34)",
  separator: "rgba(84,84,88,0.62)",
  fill: "rgba(120,120,128,0.36)",
  fill3: "rgba(118,118,128,0.24)",
  tint: "#f9eb50",
  tintInk: "#141414",
  accent: "#f9eb50",
  accentInk: "#141414",
  kid: "#f9eb50",
  ok: "#30d158",
  warn: "#ffb340",
  bad: "#ff6961",
  glass: "rgba(72,72,78,0.55)",
  glassStrong: "rgba(58,58,62,0.80)",
  glassEdge: "rgba(0,0,0,0.55)",
  glassSpec: "rgba(255,255,255,0.22)",
  navy600: "#004e7a",
  navy900: "#022539",
  cream: "#f7f5f2",
  sun: "#f9eb50",
  sage: "#a7c4bc",
  sageInk: "#a7c4bc",
  sysGreen: "#30d158",
  sysRed: "#ff453a",
  sysOrange: "#ff9f0a",
  sysBlue: "#0a84ff",
  sysIndigo: "#5e5ce6",
  sysTeal: "#40c8e0",
  // — Ajouts canevas Claude Design (feuille c8a22b05…) —
  elev: "#1c1c1e",
  label4: "rgba(235,235,245,0.18)",
  sepOpaque: "#38383a",
  fill2: "rgba(120,120,128,0.32)",
  fill4: "rgba(118,118,128,0.18)",
  tintSoft: "rgba(249,235,80,0.14)",
  tintText: "#f9eb50",
  kidText: "#f9eb50",
  okSoft: "rgba(48,209,88,0.16)",
  glassTint: "rgba(249,235,80,0.92)",
  bubIn: "#26252a",
  segOn: "#636366",
  tabOn: "rgba(255,255,255,0.08)",
  sysYellow: "#ffcc00",
  sysMint: "#63e6e2",
  sysCyan: "#64d2ff",
  sysPurple: "#bf5af2",
  sysPink: "#ff375f",
} as const;

const carnetColors = {
  bgGrouped: "#f7f5f2",
  bgGrouped2: "#ffffff",
  bgGrouped3: "#efebe5",
  label: "#022539",
  label2: "rgba(2,37,57,0.66)",
  label3: "rgba(2,37,57,0.34)",
  separator: "rgba(2,37,57,0.14)",
  fill: "rgba(2,37,57,0.12)",
  fill3: "rgba(2,37,57,0.07)",
  tint: "#004e7a",
  tintInk: "#ffffff",
  accent: "#f9eb50",
  accentInk: "#022539",
  kid: "#b9503a",
  ok: "#2e6b4f",
  warn: "#8a5a00",
  bad: "#b42318",
  glass: "rgba(255,253,250,0.66)",
  glassStrong: "rgba(255,253,250,0.84)",
  glassEdge: "rgba(2,37,57,0.12)",
  glassSpec: "rgba(255,255,255,0.95)",
  navy600: "#004e7a",
  navy900: "#022539",
  cream: "#f7f5f2",
  sun: "#f9eb50",
  sage: "#a7c4bc",
  sageInk: "#46695f",
  sysGreen: "#34c759",
  sysRed: "#ff3b30",
  sysOrange: "#ff9500",
  sysBlue: "#007aff",
  sysIndigo: "#5856d6",
  sysTeal: "#30b0c7",
  // — Ajouts canevas Claude Design (feuille c8a22b05…) —
  elev: "#ffffff",
  label4: "rgba(2,37,57,0.16)",
  sepOpaque: "#ddd7cf",
  fill2: "rgba(2,37,57,0.09)",
  fill4: "rgba(2,37,57,0.05)",
  tintSoft: "rgba(0,78,122,0.09)",
  tintText: "#004e7a",
  kidText: "#a8412b",
  okSoft: "rgba(52,199,89,0.16)",
  glassTint: "rgba(0,78,122,0.88)",
  bubIn: "#ebe6de",
  segOn: "#ffffff",
  tabOn: "rgba(2,37,57,0.07)",
  sysYellow: "#ffcc00",
  sysMint: "#00c7be",
  sysCyan: "#32ade6",
  sysPurple: "#af52de",
  sysPink: "#ff2d55",
} as const;

export type ColorTokens = { -readonly [K in keyof typeof natifColors]: string };

export const COLORS: Record<StyleKey, ColorTokens> = {
  natif: natifColors,
  nuit: nuitColors,
  carnet: carnetColors,
};

/**
 * Styles de texte du canevas (classes `.t-*`, px = pt en RN). `weight` choisit la famille chargée.
 * Les noms Apple (largeTitle, subheadline, footnote, caption1/2) restent des alias des noms du canevas.
 * En Carnet, `largetitle`/`title1`/`title2`/`sectionTitle` passent en Fraunces 600 : cf. `typeSpec()`.
 */
export type TextStyleName =
  | 'largetitle' | 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'callout'
  | 'sub' | 'subheadline' | 'foot' | 'footnote' | 'cap' | 'caption1' | 'cap2' | 'caption2'
  | 'sectionTitle' | 'numeralHero' | 'displayLarge' | 'displayQuote';

export type TextSpec = {
  fontSize: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700 | 800;
  letterSpacing?: number;
  /** `display` = Fraunces (titres Carnet, « 0 $ »), `rounded` = chiffres système. */
  family?: 'sans' | 'display' | 'rounded';
};

const LARGE_TITLE: TextSpec = { fontSize: 34, lineHeight: 41, weight: 700, letterSpacing: 0.2 };
const TITLE1: TextSpec = { fontSize: 28, lineHeight: 34, weight: 700, letterSpacing: 0.36 };
const TITLE2: TextSpec = { fontSize: 22, lineHeight: 28, weight: 700, letterSpacing: -0.26 };
const SUB: TextSpec = { fontSize: 15, lineHeight: 20, weight: 400, letterSpacing: -0.23 };
const FOOT: TextSpec = { fontSize: 13, lineHeight: 18, weight: 400, letterSpacing: -0.08 };
const CAP: TextSpec = { fontSize: 12, lineHeight: 16, weight: 400, letterSpacing: 0 };
const CAP2: TextSpec = { fontSize: 11, lineHeight: 13, weight: 600, letterSpacing: 0.06 };

export const TYPE: Record<TextStyleName, TextSpec> = {
  largetitle: LARGE_TITLE,
  largeTitle: LARGE_TITLE,
  title1: TITLE1,
  title2: TITLE2,
  title3: { fontSize: 20, lineHeight: 25, weight: 600, letterSpacing: -0.45 },
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
  /** `.sec-h h4` : même échelle que title2 (Fraunces 600 en Carnet, interlettrage inchangé). */
  sectionTitle: TITLE2,
  numeralHero: { fontSize: 64, lineHeight: 64, weight: 600, family: 'rounded' },
  displayLarge: { fontSize: 36, lineHeight: 42, weight: 600, letterSpacing: -0.2, family: 'display' },
  displayQuote: { fontSize: 20, lineHeight: 26, weight: 500, family: 'display' },
};

/** Style de texte effectif selon le style de l'app (`[data-v="v3"] .largetitle/.t-title1/.t-title2/.sec-h h4`). */
export function typeSpec(name: TextStyleName, style: StyleKey = DEFAULT_STYLE): TextSpec {
  const spec = TYPE[name];
  if (style !== 'carnet') return spec;
  if (name === 'largetitle' || name === 'largeTitle') return TYPE.displayLarge;
  if (name === 'title1' || name === 'title2') return { ...spec, weight: 600, letterSpacing: -0.2, family: 'display' };
  if (name === 'sectionTitle') return { ...spec, weight: 600, family: 'display' };
  return spec;
}

/** Noms de familles chargées par expo-font (cf. fonts.ts). */
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
 * Géométrie propre à chaque style (variables `--card-r`, `--row-r`, `--display*`, `--shadow-card`
 * du canevas). Natif et Nuit calme partagent les mêmes mesures.
 */
export type StyleMetrics = {
  cardRadius: number;
  rowRadius: number;
  /** Titres éditoriaux : Inter (natif/nuit) ou Fraunces (carnet). */
  displayFamily: 'sans' | 'display';
  displayWeight: 600 | 700;
  displayTrack: number;
  largeTitleSize: number;
  largeTitleLine: number;
  /** Ombre portée des cartes/listes : Carnet uniquement. */
  cardShadow: boolean;
};

export const STYLE_METRICS: Record<StyleKey, StyleMetrics> = {
  natif: { cardRadius: 26, rowRadius: 26, displayFamily: 'sans', displayWeight: 700, displayTrack: 0.2, largeTitleSize: 34, largeTitleLine: 41, cardShadow: false },
  nuit: { cardRadius: 26, rowRadius: 26, displayFamily: 'sans', displayWeight: 700, displayTrack: 0.2, largeTitleSize: 34, largeTitleLine: 41, cardShadow: false },
  carnet: { cardRadius: 24, rowRadius: 22, displayFamily: 'display', displayWeight: 600, displayTrack: -0.2, largeTitleSize: 36, largeTitleLine: 42, cardShadow: true },
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
  /** Médaillon de la mascotte (`radial-gradient` crème, identique dans les 3 styles). */
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
  /** Carnet de saison : 22–24 pt. */
  cardCarnet: 24,
  /** Listes du Carnet (`--row-r` : 22). */
  rowCarnet: 22,
  sheet: 38,
  sheetFloat: 46,
  full: 9999,
} as const;

/** Seule ombre autorisée : cartes du style Carnet. */
export const SHADOW_CARD_CARNET = {
  shadowColor: '#022539',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
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
    isDark: style === 'nuit',
    colors: COLORS[style],
    metrics: STYLE_METRICS[style],
    spacing: SPACING,
    radius: RADIUS,
    type: TYPE,
  };
}
