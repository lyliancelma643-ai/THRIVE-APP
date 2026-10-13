import { CANVAS, type ColorTokens, type StyleKey } from '../../design/tokens';

/**
 * Couleur d'avatar d'un enfant suivi, selon son rang dans la famille (le canevas : 1er = couleur `kid`,
 * 2e = sauge ; encre marine sur les fonds clairs de Veillée). Aucune donnée : seulement des tokens.
 */
export function kidAvatarColors(index: number, colors: ColorTokens, styleKey: StyleKey): { background: string; ink: string } {
  const veillee = styleKey === 'veillee';
  const ink = veillee ? colors.tintInk : CANVAS.white;
  const palette = [colors.kid, veillee ? colors.sage : colors.sageInk, colors.sysIndigo, colors.sysTeal, colors.sysOrange];
  return { background: palette[index % palette.length], ink: index % palette.length >= 2 ? CANVAS.white : ink };
}
