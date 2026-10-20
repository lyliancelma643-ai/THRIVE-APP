import { THEME_COLORS, useTheme, withAlpha, type ThemeStyleKey } from '../../design';

/**
 * Valeurs propres aux écrans Maison (GO 4 · Lin et Veillée). Tout ce qui a un jeton (fonds, encres, filets,
 * sauge, soleil, verre) se lit dans `useTheme().colors` : les écrans ne contiennent aucune couleur en dur.
 * Ne restent ici que les constantes de composition de l'affiche du soir (K) et de la scène du moment (M).
 */

/** Affiche du soir (`S.K`, section 676 pt) : voile du haut et opacité du fond flouté, par style. */
export const HERO_BY_STYLE: Record<ThemeStyleKey, { topVeil: string; blurOpacity: number }> = {
  lin: { topVeil: withAlpha(THEME_COLORS.lin.bgGrouped, 0.35), blurOpacity: 0.9 },
  veillee: { topVeil: withAlpha(THEME_COLORS.veillee.bgGrouped, 0.55), blurOpacity: 0.55 },
};

/** Fiche moment (`S.L`, section 372 pt) : opacité du fond flouté, par style. */
export const FICHE_BLUR_OPACITY: Record<ThemeStyleKey, number> = { lin: 0.85, veillee: 0.5 };

export function useHeroStyle() {
  const { styleKey } = useTheme();
  return { styleKey, ...HERO_BY_STYLE[styleKey], ficheBlurOpacity: FICHE_BLUR_OPACITY[styleKey] };
}

/** Pastille « Bientôt » de la porte vidéo (couleur d'attente, identique dans les deux styles). */
export const SOON_TAG = { bg: '#FFE7B8', ink: '#5A3A00' } as const;

/** Fond d'une vignette qui charge. */
export const POSTER_BG = '#F3EFE6';

/**
 * Scène « Moment en cours » : le mode activité est TOUJOURS sur le marine de Veillée (GO 4 §3.5), dans les deux
 * styles. Conservé ici pour MomentView / moment/[activityId] (lot L4), qui l'indexent par style.
 */
export const MOMENT_BACKGROUND: Record<ThemeStyleKey, string> = {
  lin: THEME_COLORS.veillee.bgGrouped,
  veillee: THEME_COLORS.veillee.bgGrouped,
};

export function momentInk(alpha: number): string {
  return withAlpha('#FFFFFF', alpha);
}
