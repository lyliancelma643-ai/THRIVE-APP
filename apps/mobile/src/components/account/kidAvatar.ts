import { CANVAS, type ColorTokens, type StyleKey } from '../../design/tokens';

/** Maquette F (V4/V5) : le 2e enfant est en bleu marine (Lin) ou bleu ciel de nuit (Veillée), encre crème. */
const SECOND_KID = { lin: '#004E7A', veillee: '#3380AC' } as const;

/**
 * Couleur d'avatar d'un enfant suivi, selon son rang dans la famille (maquette F : 1er = couleur `kid`,
 * 2e = bleu ; encre marine sur le fond clair de Veillée). Aucune donnée : seulement des tokens et deux constantes de la maquette.
 */
export function kidAvatarColors(index: number, colors: ColorTokens, styleKey: StyleKey): { background: string; ink: string } {
  const veillee = styleKey === 'veillee';
  const ink = veillee ? colors.tintInk : CANVAS.white;
  const rank = index % 5;
  if (rank === 1) return { background: SECOND_KID[styleKey], ink: colors.cream };
  const palette = [colors.kid, SECOND_KID[styleKey], colors.sysIndigo, colors.sysTeal, colors.sysOrange];
  return { background: palette[rank], ink: rank >= 2 ? CANVAS.white : ink };
}
