import { CANVAS } from '../../design';

/**
 * Couleurs propres aux écrans « scène » des séances vidéo (P, Q) et à l'étiquette « En construction » (O) du canevas :
 * elles ne changent pas d'un style à l'autre (le fond d'une vidéo est toujours noir, le texte posé dessus toujours blanc).
 * Tout le reste vient de `useTheme().colors`.
 */
export const SCENE = {
  /** Fond d'une scène vidéo (Natif, Nuit calme). Carnet : `colors.navy900`. */
  black: '#000000',
  white: CANVAS.white,
  /** Avatar du parent / coach (pastille grise de P). */
  partnerAvatar: '#3A3A3C',
  /** Étiquette « En construction » (`.tag` ambre du canevas). */
  buildTagBg: '#FFE7B8',
  buildTagInk: '#5A3A00',
  /** Étiquette « Bientôt » posée sur une vignette. */
  lockTagBg: 'rgba(0,0,0,0.55)',
} as const;

/** Blanc à une opacité donnée (`rgba(255,255,255,a)` du canevas). */
export function whiteAlpha(a: number): string {
  return `rgba(255,255,255,${a})`;
}
