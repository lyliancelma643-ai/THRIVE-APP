// Activité → vignette. La table des 52 images vit dans src/design (S1) : on ne la duplique pas.
import { BASE_VIGNETTE_ID, resolveVignetteId } from '../design/vignetteIds';

/** Identifiant de vignette d'une activité (repli sur la mascotte si pas d'image, ex. ACT-0704). */
export function vignetteIdFor(activity: { id: string } | string | null | undefined): string {
  if (!activity) return BASE_VIGNETTE_ID;
  return resolveVignetteId(typeof activity === 'string' ? activity : activity.id);
}

/** Libellé lu par VoiceOver pour la vignette d'une activité. */
export function vignetteLabel(activity: { title: string }): string {
  return activity.title;
}
