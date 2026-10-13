import { supabaseClient as supabase } from '@thrive/shared';
import type { MomentPayload } from './flow';

// Écritures du mode activité. Appelées SEULEMENT à la suite d'un effet du réducteur (`record`, `seal-letter`) : « Non » à
// « Enregistrer ce moment ? » n'arrive jamais jusqu'ici. Les tables et les colonnes sont celles de la migration 062 (même
// forme que le web : p3_moments, p3_letters). Insert sans relecture : le texte gardé n'est ni relu ni journalisé.

/** Enregistre le moment (check-in, débrief, capture, note, ressenti, temps réellement joué). */
export async function insertMoment(childId: string, p: MomentPayload): Promise<void> {
  const { error } = await supabase.from('p3_moments').insert({
    child_id: childId,
    activity_id: p.activityId,
    week: p.week,
    duration_chosen: p.duration_chosen,
    duration_real_s: p.duration_real_s,
    place: p.place,
    checkin: p.checkin,
    debrief: p.debrief,
    capture: p.capture,
    kept_phrase: p.kept_phrase,
    rating: p.rating,
    outcome: p.outcome,
  });
  if (error) throw error;
}

/**
 * Scelle la lettre (R12) : insert sans select, la RLS la rend illisible avant un an, même pour son auteur.
 * Le texte n'est conservé nulle part ici ; si la base est indisponible, rien n'est stocké (repli papier côté écran).
 */
export async function insertLetter(childId: string, body: string): Promise<void> {
  if (!body.trim()) throw new Error('empty-letter');
  const { error } = await supabase.from('p3_letters').insert({ child_id: childId, author: 'ENFANT', body });
  if (error) throw error;
}
