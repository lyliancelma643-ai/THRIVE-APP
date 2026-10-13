import { DEFAULT_STYLE, isStyleKey, type StyleKey } from './tokens';

/**
 * Migration des valeurs de style stockées (AsyncStorage) ou renvoyées par le serveur (`profiles.ui_style`).
 *
 * GO 3 avait trois styles ; le GO 4 n'en garde que deux. Ce fichier et son test sont le SEUL endroit du code
 * où les anciennes clés de style ont le droit d'apparaître : toute valeur lue passe par `normalizeStyle()`,
 * aucune n'est perdue.
 */
export const STYLE_MIGRATION = {
  natif: 'lin',
  carnet: 'lin',
  nuit: 'veillee',
} as const satisfies Record<string, StyleKey>;

export type LegacyStyleKey = keyof typeof STYLE_MIGRATION;

export function isLegacyStyleKey(v: unknown): v is LegacyStyleKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(STYLE_MIGRATION, v);
}

/** `lin` | `veillee` reconnus tels quels, anciennes valeurs converties ; sinon `null` (valeur absente ou inconnue). */
export function parseStyle(value: unknown): StyleKey | null {
  if (isStyleKey(value)) return value;
  if (isLegacyStyleKey(value)) return STYLE_MIGRATION[value];
  return null;
}

/** Comme `parseStyle`, mais retombe sur le style par défaut (`lin`) quand la valeur est absente ou inconnue. */
export function normalizeStyle(value: unknown, fallback: StyleKey = DEFAULT_STYLE): StyleKey {
  return parseStyle(value) ?? fallback;
}
