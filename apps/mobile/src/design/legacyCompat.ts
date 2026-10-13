/**
 * COUCHE DE COMPATIBILITÉ TEMPORAIRE (GO 4 · L1) — À SUPPRIMER quand L2–L7 ont migré leurs écrans.
 *
 * Les écrans hors `design/` lisent encore `useTheme().style` / `useStyleChoice().style` en comparant à
 * `'natif' | 'nuit' | 'carnet'`, et indexent des `Record<StyleKey, …>` avec ces clés. Pour que le typecheck
 * reste vert pendant la migration, `design/index.ts` ré-exporte ICI (en remplacement des versions strictes
 * de tokens.ts) : `StyleKey`, `STYLE_KEYS`, `STYLE_LABELS`, `COLORS`, `TAB_LAYOUTS`.
 * Valeur à l'exécution : Lin ⇒ `'natif'`, Veillée ⇒ `'nuit'` (les branches `'carnet'` sont mortes).
 *
 * Migration d'un écran : remplacer `style` par `styleKey` (`'lin' | 'veillee'`), puis les clés
 * `StyleKey`/`STYLE_KEYS`/`COLORS`/`STYLE_LABELS` strictes sont disponibles sous `ThemeStyleKey`,
 * `THEME_STYLE_KEYS`, `THEME_COLORS`, `THEME_STYLE_LABELS`. Quand plus rien n'importe la version
 * dépréciée : supprimer ce fichier et le bloc « COMPAT » de index.ts.
 */
import { TAB_LAYOUTS as STRICT_TAB_LAYOUTS, type TabLayout } from './tabConfig';
import { COLORS as STRICT_COLORS, STYLE_LABELS as STRICT_LABELS, type ColorTokens, type StyleKey as StrictStyleKey } from './tokens';
import type { LegacyStyleKey } from './styleMigration';

/** @deprecated utiliser `ThemeStyleKey` (`'lin' | 'veillee'`). */
export type StyleKey = LegacyStyleKey;

/** @deprecated clés d'avant le GO 4 ; voir `THEME_STYLE_KEYS`. */
export const STYLE_KEYS: readonly StyleKey[] = ['natif', 'nuit', 'carnet'] as const;

/** Valeur historique d'un style strict (Lin ⇒ natif, Veillée ⇒ nuit). */
export function toLegacyStyle(style: StrictStyleKey): StyleKey {
  return style === 'veillee' ? 'nuit' : 'natif';
}

/** Ajoute les anciennes clés (natif, carnet ⇒ lin ; nuit ⇒ veillée) à une table indexée par style strict. */
export function withLegacyKeys<T>(table: Record<StrictStyleKey, T>): Record<StrictStyleKey | StyleKey, T> {
  return { ...table, natif: table.lin, carnet: table.lin, nuit: table.veillee };
}

/** @deprecated */
export const STYLE_LABELS: Record<StyleKey, string> = {
  natif: STRICT_LABELS.lin,
  carnet: STRICT_LABELS.lin,
  nuit: STRICT_LABELS.veillee,
};

/** @deprecated utiliser `THEME_COLORS` ou `useTheme().colors`. */
export const COLORS: Record<StrictStyleKey | StyleKey, ColorTokens> = withLegacyKeys(STRICT_COLORS);

/** @deprecated utiliser `tabLayoutFor(styleKey)`. */
export const TAB_LAYOUTS: Record<StrictStyleKey | StyleKey, TabLayout> = withLegacyKeys(STRICT_TAB_LAYOUTS);
