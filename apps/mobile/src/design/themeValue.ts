/** Valeur du thème (logique pure, sans react-native) : testable en nœud, partagée par ThemeProvider et ThemeScope. */
import { toLegacyStyle } from './legacyCompat';
import type { LegacyStyleKey } from './styleMigration';
import { getTokens, type StyleKey, type Tokens } from './tokens';

export type ThemeContextValue = Omit<Tokens, 'style'> & {
  /** Style effectif : `'lin'` (jour) ou `'veillee'` (nuit). Dans un `<ThemeScope>`, le style forcé. */
  styleKey: StyleKey;
  /**
   * @deprecated COMPAT L2–L7 : ancienne clé (`'natif'` pour Lin, `'nuit'` pour Veillée). Utiliser `styleKey`.
   * Supprimé avec legacyCompat.ts quand les écrans ont migré.
   */
  style: LegacyStyleKey;
  /** Change le style GLOBAL de l'app (accepte aussi une ancienne valeur, normalisée). */
  setStyle: (s: StyleKey | LegacyStyleKey) => void;
  /** Réglage système « Réduire la transparence » : surfaces opaques. */
  reduceTransparency: boolean;
  /** Réglage système « Réduire les animations ». */
  reduceMotion: boolean;
  fontsLoaded: boolean;
};

export type StyleDerivedTheme = Omit<ThemeContextValue, 'setStyle' | 'reduceTransparency' | 'reduceMotion' | 'fontsLoaded'>;

/** Tokens d'un style, avec l'alias hérité `style` (COMPAT). */
export function themeFor(styleKey: StyleKey): StyleDerivedTheme {
  const t = getTokens(styleKey);
  return {
    isDark: t.isDark, colors: t.colors, metrics: t.metrics, spacing: t.spacing, radius: t.radius, type: t.type,
    styleKey, style: toLegacyStyle(styleKey),
  };
}

/** Thème d'un sous-arbre forcé : tout vient du style demandé, sauf `setStyle` et les préférences d'accessibilité. */
export function scopeTheme(parent: ThemeContextValue, style: StyleKey): ThemeContextValue {
  return { ...parent, ...themeFor(style) };
}
