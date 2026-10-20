// Logique pure de Maison (sélection du moment du soir, états des semaines, minuteur,
// carnet). Aucune dépendance React : testée dans logic.test.ts.
import {
  REWARDS,
  WEEK_COUNT,
  activitiesOfWeek,
  getWeek,
  isWeekComplete,
  newlyEarned,
  unlockedWeeks,
  type AgeBand,
  type P3Activity,
  type Reward,
} from '../../lib/p3';

export type Tonight = {
  activity: P3Activity;
  openWeek: number;
  weekTitle: string;
  /** Les fiches cœur de la semaine ouverte pour la tranche d'âge (ordre du programme). */
  weekActivities: P3Activity[];
};

/**
 * Le moment recommandé ce soir : même règle que l'ancienne page Maison.
 * Semaine N+1 ouverte quand les 3 fiches de la semaine N sont vécues ; première fiche
 * cœur non vécue de la semaine ouverte, filtrée par tranche d'âge. Si tout est vécu
 * (dernière semaine), on propose la première fiche de la semaine : jamais d'impasse.
 */
export function recommendTonight(
  pool: P3Activity[],
  doneIds: ReadonlySet<string>,
  band: AgeBand | null,
): Tonight | null {
  const openWeek = unlockedWeeks(doneIds);
  const weekActivities = activitiesOfWeek(openWeek, pool).filter((a) => !band || a.age_bands.includes(band));
  const activity = weekActivities.find((a) => !doneIds.has(a.id)) ?? weekActivities[0];
  if (!activity) return null;
  return { activity, openWeek, weekTitle: getWeek(openWeek)?.title ?? '', weekActivities };
}

/** Ligne de raison sous le titre : rend la personnalisation visible, sans pression. */
export function reasonLine(t: Tonight): string {
  return `Le cœur de la semaine ${t.openWeek} : ${t.activity.objective}`;
}

export type WeekState = 'faite' | 'en_cours' | 'a_venir';

/** État neutre d'une semaine : faite / en cours / pas encore ouverte (jamais « en retard »). */
export function weekState(week: number, openWeek: number, doneIds: ReadonlySet<string>): WeekState {
  if (week > openWeek) return 'a_venir';
  if (isWeekComplete(week, doneIds)) return 'faite';
  return 'en_cours';
}

export type ParcoursWeek = { week: number; title: string; state: WeekState; activities: P3Activity[] };

/** Les 13 semaines et toutes leurs fiches (cœur puis compléments), pour « Tout le parcours ». */
export function buildParcours(pool: P3Activity[], doneIds: ReadonlySet<string>): ParcoursWeek[] {
  const openWeek = unlockedWeeks(doneIds);
  return Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map((week) => ({
    week,
    title: getWeek(week)?.title ?? `Semaine ${week}`,
    state: weekState(week, openWeek, doneIds),
    activities: pool.filter((a) => a.week === week).sort((a, b) => a.rank - b.rank),
  }));
}

/** Fiches faites pour que la page « Quand il dit non » ne liste que celles qui y répondent. */
export function antiRefusal(pool: P3Activity[], band: AgeBand | null): P3Activity[] {
  return pool.filter((a) => a.anti_refusal && (!band || a.age_bands.includes(band)));
}

export function durationLabel(min: number): string {
  return `${min} min`;
}

// ── Minuteur ────────────────────────────────────────────────────────────────
/** « 12:24 » — minutes:secondes, zéros de tête sur les secondes. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Part écoulée du moment, entre 0 et 1. */
export function elapsedRatio(elapsedMs: number, durationMin: number): number {
  const total = durationMin * 60_000;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedMs / total));
}

/** Secondes restantes (jamais négatives). */
export function remainingSeconds(elapsedMs: number, durationMin: number): number {
  return Math.max(0, Math.ceil((durationMin * 60_000 - elapsedMs) / 1000));
}

// ── Carnet ──────────────────────────────────────────────────────────────────
export type EarnedReward = { reward: Reward; label: string };

/** Objets déjà gagnés (acquis pour toujours) et ceux à venir, libellés avec le prénom. */
export function carnetObjects(doneIds: ReadonlySet<string>, momentsTotal: number, firstName: string) {
  const available = REWARDS.filter((r) => r.available);
  const earnedIds = new Set(newlyEarned({ alreadyEarned: new Set(), doneIds, momentsTotal, subscriptionMonths: 0 }));
  const fill = (r: Reward) => r.label.replace(/\{prenom\}/g, firstName);
  return {
    earned: available.filter((r) => earnedIds.has(r.id)).map((r) => ({ reward: r, label: fill(r) })),
    upcoming: available.filter((r) => !earnedIds.has(r.id)).map((r) => ({ reward: r, label: fill(r) })),
  };
}
