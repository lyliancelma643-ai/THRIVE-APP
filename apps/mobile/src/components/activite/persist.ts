import { supabaseClient as supabase } from '@thrive/shared';
import type { Duration } from '../../lib/p3';
import type { MomentPayload } from './flow';

// Écritures du mode activité. Appelées SEULEMENT à la suite d'un effet du réducteur (`record`, `seal-letter`) : « Non » à
// « Enregistrer ce moment ? » n'arrive jamais jusqu'ici. Les tables et les colonnes sont celles de la migration 062 (même
// forme que le web : p3_moments, p3_letters). Insert sans relecture : le texte gardé n'est ni relu ni journalisé.

/** Ligne de `p3_moments` pour un moment (colonnes de la migration 062). Pure : testée sans réseau. */
export function momentRow(childId: string, p: MomentPayload) {
  return {
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
  };
}

/**
 * Enregistre le moment (check-in, débrief, capture, note, ressenti, temps réellement joué).
 * SEUL écrivain de `p3_moments` dans l'app : le mode activité et la fin de moment de la Maison (`recordMoment`) passent ici.
 */
export async function insertMoment(childId: string, p: MomentPayload): Promise<void> {
  const { error } = await supabase.from('p3_moments').insert(momentRow(childId, p));
  if (error) throw error;
}

/** Moment clos depuis la Maison (« C'est fait ? ») sous la forme du mode activité : seules ces colonnes sont renseignées. */
export function maisonMomentPayload(input: {
  activityId: string;
  week: number;
  duration: Duration;
  outcome: 'ACCROCHE' | 'MOYEN' | 'PAS_CE_SOIR';
  keptPhrase?: string;
}): MomentPayload {
  return {
    activityId: input.activityId,
    week: input.week,
    duration_chosen: input.duration,
    duration_real_s: null,
    place: 'maison',
    checkin: null,
    debrief: null,
    capture: null,
    kept_phrase: input.keptPhrase?.trim() || null,
    rating: null,
    outcome: input.outcome,
  };
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
