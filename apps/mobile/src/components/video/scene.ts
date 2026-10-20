import { CANVAS } from '../../design';

/**
 * Couleurs propres aux écrans « scène » des séances vidéo (P, Q) et à l'étiquette « En construction » (O) du canevas :
 * elles ne changent pas d'un style à l'autre (le fond d'une vidéo est toujours noir, le texte posé dessus toujours blanc).
 * Tout le reste vient de `useTheme().colors`.
 */
export const SCENE = {
  /** Fond d'une scène vidéo en lecture (Q, R) : toujours noir, dans les deux styles. */
  black: '#000000',
  /** Fond marine de « Prêt avec … ? » (P) : le bas du dégradé radial du canevas. */
  marine: '#022539',
  /** Avatar de l'enfant sur la scène marine de P (sauge clair, encre marine). */
  childAvatarBg: '#A7C4BC',
  childAvatarInk: '#022539',
  /** Haut du dégradé radial de P (`#0f4563` → `#022539`). */
  marineLight: '#0F4563',
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
