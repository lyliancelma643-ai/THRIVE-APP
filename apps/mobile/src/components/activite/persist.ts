import { supabaseClient as supabase } from '@thrive/shared';
import { buildRewardPayload, momentsCount, newlyEarned, type Duration, type P3MomentRow, type RewardId } from '../../lib/p3';
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
 * Enregistre le moment (check-in, débrief, capture, note, ressenti, temps réellement joué), puis écrit les objets du carnet
 * qu'il vient de faire gagner (`p3_rewards`, comme le web). SEUL écrivain de `p3_moments` et de `p3_rewards` dans l'app : le
 * mode activité et la fin de moment de la Maison (`recordMoment`) passent ici. L'écriture des objets ne fait jamais échouer
 * un moment déjà enregistré.
 */
export async function insertMoment(childId: string, p: MomentPayload, opts: { sealedAt?: string | null } = {}): Promise<void> {
  const { error } = await supabase.from('p3_moments').insert(momentRow(childId, p));
  if (error) throw error;
  await recordRewards(childId, opts);
}

const MOMENT_COLUMNS = 'activity_id, created_at, duration_chosen, rating, week, kept_phrase, capture, place, outcome';

/**
 * Objets nouvellement gagnés (règle `newlyEarned` du web, sans facturation : `subscriptionMonths` = 0, le Book n'est jamais
 * débloqué ici) : une ligne `p3_rewards (child_id, reward_id, payload)` par objet, charge utile figée par `buildRewardPayload`
 * (le corps d'une lettre n'y figure jamais, seulement sa date de scellement). Idempotent : la clé (child_id, reward_id) est
 * unique et les objets déjà gagnés sont relus avant ; un conflit est ignoré. Aucun droit n'est calculé ici.
 */
export async function recordRewards(childId: string, opts: { sealedAt?: string | null } = {}): Promise<RewardId[]> {
  try {
    const [moments, rewards] = await Promise.all([
      supabase.from('p3_moments').select(MOMENT_COLUMNS).eq('child_id', childId),
      supabase.from('p3_rewards').select('reward_id, payload').eq('child_id', childId),
    ]);
    if (moments.error || rewards.error) return [];
    const rows = (moments.data ?? []) as P3MomentRow[];
    const earned = (rewards.data ?? []) as { reward_id: RewardId; payload: Record<string, unknown> | null }[];
    const earnedMap = new Map(earned.map((r) => [r.reward_id, r.payload] as const));
    const ids = newlyEarned({
      alreadyEarned: new Set(earned.map((r) => r.reward_id)),
      doneIds: new Set(rows.map((m) => m.activity_id)),
      momentsTotal: momentsCount(rows),
      subscriptionMonths: 0,
    });
    const written: RewardId[] = [];
    for (const id of ids) {
      const payload = buildRewardPayload(id, rows, { earned: earnedMap, sealedAt: opts.sealedAt ?? null });
      earnedMap.set(id, payload);
      const { error } = await supabase.from('p3_rewards').insert({ child_id: childId, reward_id: id, payload });
      if (!error || error.code === '23505') written.push(id);
    }
    return written;
  } catch {
    return [];
  }
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

/**
 * Scellement complet : la lettre, puis l'objet « La lettre » (`lettre_un_an`) avec sa seule date de scellement, tout de suite
 * (« Non » à « Enregistrer ce moment ? » laisse la lettre scellée, D3). Le corps n'est jamais écrit dans `p3_rewards`.
 * Renvoie l'instant de scellement ; l'écriture de l'objet est sans conséquence si elle échoue (le web la réécrit au moment).
 */
export async function sealLetter(childId: string, body: string, now: Date = new Date()): Promise<number> {
  await insertLetter(childId, body);
  try {
    const payload = buildRewardPayload('lettre_un_an', [], { sealedAt: now.toISOString() });
    await supabase.from('p3_rewards').insert({ child_id: childId, reward_id: 'lettre_un_an', payload });
  } catch {
    /* objet déjà gagné ou base indisponible : la lettre, elle, est scellée */
  }
  return now.getTime();
}
