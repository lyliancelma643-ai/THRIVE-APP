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
} as const;

export type ColorTokens = { -readonly [K in keyof typeof natifColors]: string };

export const COLORS: Record<StyleKey, ColorTokens> = {
  natif: natifColors,
  nuit: nuitColors,
  carnet: carnetColors,
};

/** Styles de texte (px = pt en RN). `weight` choisit la famille Inter chargée. */
export type TextStyleName =
  | 'largeTitle' | 'title1' | 'title2' | 'title3' | 'headline' | 'body' | 'callout'
  | 'subheadline' | 'footnote' | 'caption1' | 'caption2' | 'numeralHero'
  | 'displayLarge' | 'displayQuote';

export type TextSpec = {
  fontSize: number;
  lineHeight: number;
  weight: 400 | 500 | 600 | 700;
  letterSpacing?: number;
  /** `display` = Fraunces (titres Carnet, « 0 $ »), `rounded` = chiffres système. */
  family?: 'sans' | 'display' | 'rounded';
};

export const TYPE: Record<TextStyleName, TextSpec> = {
  largeTitle: { fontSize: 34, lineHeight: 41, weight: 700, letterSpacing: 0.4 },
  title1: { fontSize: 28, lineHeight: 34, weight: 700, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, weight: 700, letterSpacing: -0.26 },
  title3: { fontSize: 20, lineHeight: 25, weight: 600, letterSpacing: -0.45 },
  headline: { fontSize: 17, lineHeight: 22, weight: 600, letterSpacing: -0.43 },
  body: { fontSize: 17, lineHeight: 22, weight: 400, letterSpacing: -0.43 },
  callout: { fontSize: 16, lineHeight: 21, weight: 400, letterSpacing: -0.31 },
  subheadline: { fontSize: 15, lineHeight: 20, weight: 400, letterSpacing: -0.23 },
  footnote: { fontSize: 13, lineHeight: 18, weight: 400, letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, weight: 400 },
  caption2: { fontSize: 11, lineHeight: 13, weight: 600, letterSpacing: 0.06 },
  numeralHero: { fontSize: 64, lineHeight: 64, weight: 600, family: 'rounded' },
  displayLarge: { fontSize: 36, lineHeight: 42, weight: 600, letterSpacing: -0.2, family: 'display' },
  displayQuote: { fontSize: 20, lineHeight: 26, weight: 500, family: 'display' },
};

/** Noms de familles chargées par expo-font (cf. fonts.ts). */
export const FONT_FAMILIES = {
  sans: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
  display: {
    400: 'Fraunces_400Regular',
    500: 'Fraunces_500Medium',
    600: 'Fraunces_600SemiBold',
    700: 'Fraunces_600SemiBold',
  },
} as const;

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
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  type: typeof TYPE;
};

export function getTokens(style: StyleKey): Tokens {
  return {
    style,
    isDark: style === 'nuit',
    colors: COLORS[style],
    spacing: SPACING,
    radius: RADIUS,
    type: TYPE,
  };
}
