import { CANVAS, type ColorTokens, type StyleKey } from '../../design';

/**
 * Couleur d'avatar d'un enfant suivi, selon son rang dans la famille (le canevas : 1er = couleur `kid`,
 * 2e = sauge ; encre foncée sur les fonds clairs de Nuit calme). Aucune donnée : seulement des tokens.
 */
export function kidAvatarColors(index: number, colors: ColorTokens, style: StyleKey): { background: string; ink: string } {
  const nuit = style === 'nuit';
  const ink = nuit ? colors.tintInk : CANVAS.white;
  const palette = [colors.kid, nuit ? colors.sage : colors.sageInk, colors.sysIndigo, colors.sysTeal, colors.sysOrange];
  return { background: palette[index % palette.length], ink: index % palette.length >= 2 ? CANVAS.white : ink };
}
