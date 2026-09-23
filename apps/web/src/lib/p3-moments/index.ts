// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — règles métier, sans I/O.
//
// Le contenu (13 semaines × 3 fiches) vit dans src/content/p3-moments/ et est
// parsé en JSON par les tests (activities.generated.json). Ici : uniquement
// les règles, testées une à une dans p3-moments.test.ts.
//
// Les 4 règles anti-culpabilité (Architecture P3, §1.1) sont codées ici et
// verrouillées par des tests :
//   1. Rien n'affiche jamais une série perdue — une série cassée renvoie null.
//   2. Aucune notification ne mentionne la série ni un manque.
//   3. Le compteur cumulatif ne redescend jamais et occupe la place principale.
//   4. Une récompense gagnée est acquise pour toujours (aucune fonction ne retire).
// ─────────────────────────────────────────────────────────────────────────────

import generated from './activities.generated.json';
import type { AgeBand, ChildMood, Duration, ParentEnergy, P3Activity, P3Week, Place } from './parse';

export type * from './parse';

const DATA = generated as unknown as { weeks: P3Week[]; activities: P3Activity[] };

export const P3_WEEKS: P3Week[] = DATA.weeks;
export const P3_ACTIVITIES: P3Activity[] = DATA.activities;
export const WEEK_COUNT = 13;
export const WEEKLY_TARGET = 3;

/** En prod, seules les fiches validées par Lylian (statut « publie ») sortent. */
export function publishedActivities(all: P3Activity[] = P3_ACTIVITIES, includeReviewed = false): P3Activity[] {
  return all.filter((a) => a.status === 'publie' || (includeReviewed && a.status === 'revu'));
}

export function getActivity(id: string): P3Activity | null {
  return P3_ACTIVITIES.find((a) => a.id === id.toUpperCase()) ?? null;
}
export function getWeek(n: number): P3Week | null {
  return P3_WEEKS.find((w) => w.week === n) ?? null;
}
export function activitiesOfWeek(n: number): P3Activity[] {
  return P3_ACTIVITIES.filter((a) => a.week === n).sort((a, b) => a.rank - b.rank);
}

// ── Âge ──────────────────────────────────────────────────────────────────────
/** V1 = 8–17 ans (décision du 22/09). Moins de 8 ans : hors périmètre → null. */
export function bandForAge(age: number): AgeBand | null {
  if (age < 8) return null;
  if (age <= 11) return '8-11';
  if (age <= 14) return '12-14';
  return '15-17';
}

// ── Durée et amorce dynamique ────────────────────────────────────────────────
export const DURATION_WORDS: Record<Duration, string> = {
  10: 'dix minutes',
  20: 'vingt minutes',
  30: 'trente minutes',
};

/** Durée effectivement jouée : jamais moins que le socle, jamais plus que le max de la fiche. */
export function effectiveDuration(a: P3Activity, declared: Duration): Duration | null {
  if (declared < a.base_duration) return null; // fiche native trop longue pour ce soir
  const max = Math.max(...a.durations) as Duration;
  return (declared > max ? max : declared) as Duration;
}

/**
 * Amorce à afficher. Règle produit (étalon S1) : le chiffre annoncé est TOUJOURS
 * celui du minuteur — un enfant qui entend « dix » et voit « vingt » cesse de croire la phrase.
 */
export function renderOpener(a: P3Activity, duration: Duration, band: AgeBand): string {
  const variant = a.variants.find((v) => v.band === band);
  const raw = (band !== '8-11' && variant?.opener) || a.opener;
  return raw.replace(/\{duree\}/g, DURATION_WORDS[duration]);
}

/** Tout ce que l'écran « fiche » et le « mode activité » affichent pour une durée et un âge. */
export function resolveActivity(a: P3Activity, declared: Duration, band: AgeBand) {
  const duration = effectiveDuration(a, declared);
  if (!duration) return null;
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle,
    objective: a.objective,
    duration,
    opener: renderOpener(a, duration, band),
    steps: a.steps,
    screen_steps: a.screen_steps,
    donts: a.donts,
    what_you_will_see: a.what_you_will_see,
    /** Étendues automatiquement selon la durée choisie (§2.2 : adaptation en aval). */
    extensions: a.extensions.filter((e) => e.adds_to <= duration),
    variant: band === '8-11' ? null : (a.variants.find((v) => v.band === band)?.text ?? null),
    debrief: a.debrief,
    closing: a.closing,
  };
}

// ── Données d'usage (lignes de la table p3_moments) ──────────────────────────
export type Moment = {
  activity_id: string;
  created_at: string; // ISO
  duration_chosen: Duration;
  rating: 1 | 2 | 3 | 4 | 5 | null;
};

// ── Compteur cumulatif (règle 3) ─────────────────────────────────────────────
/** [PROPOSÉ spec §1.1] un moment de 30 min compte double. Décision à confirmer par Lylian. */
export const COUNT_30_AS_DOUBLE = true;

export function momentsCount(moments: Moment[]): number {
  return moments.reduce((n, m) => n + (COUNT_30_AS_DOUBLE && m.duration_chosen === 30 ? 2 : 1), 0);
}

/** « 47 moments avec Léa » — une phrase, jamais un score. */
export function momentsPhrase(count: number, firstName: string): string | null {
  if (count <= 0) return null;
  return count === 1 ? `1 moment avec ${firstName}` : `${count} moments avec ${firstName}`;
}

// ── Semaine calendaire : objectif 3 moments (lundi → dimanche) ───────────────
export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  return x;
}
const weekKey = (d: Date) => mondayOf(d).toISOString().slice(0, 10);

export function weeklyProgress(moments: Moment[], now: Date): { done: number; target: number; complete: boolean } {
  const key = weekKey(now);
  const done = moments.filter((m) => weekKey(new Date(m.created_at)) === key).length;
  return { done: Math.min(done, WEEKLY_TARGET), target: WEEKLY_TARGET, complete: done >= WEEKLY_TARGET };
}

/**
 * Série hebdomadaire (bonus secondaire) : semaines complètes consécutives.
 * La semaine en cours ne casse jamais la série tant qu'elle n'est pas finie.
 * Règle 1 : une série cassée ou inférieure à 2 renvoie null → le composant disparaît.
 */
export function weeklyStreak(moments: Moment[], now: Date): number | null {
  const counts = new Map<string, number>();
  for (const m of moments) {
    const k = weekKey(new Date(m.created_at));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const cursor = mondayOf(now);
  let streak = 0;
  if ((counts.get(weekKey(cursor)) ?? 0) >= WEEKLY_TARGET) streak++;
  cursor.setDate(cursor.getDate() - 7);
  while ((counts.get(weekKey(cursor)) ?? 0) >= WEEKLY_TARGET) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak >= 2 ? streak : null;
}

/** Série quotidienne : bonus caché, affichée seulement à partir de 3 jours, jamais quand elle casse. */
export function dailyStreak(moments: Moment[], now: Date): number | null {
  const days = new Set(moments.map((m) => new Date(m.created_at).toDateString()));
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // aujourd'hui n'est pas encore fini
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n >= 3 ? n : null;
}

// ── Progression dans le programme ────────────────────────────────────────────
/**
 * Semaine N+1 ouverte quand les 3 fiches de la semaine N ont été faites au moins une fois.
 * Aucune pression calendaire : un parent lent avance lentement, sans jamais être « en retard ».
 * [À TRANCHER] autoriser un bouton « passer à la semaine suivante ».
 */
export function unlockedWeeks(doneIds: ReadonlySet<string>): number {
  let w = 1;
  while (w < WEEK_COUNT && activitiesOfWeek(w).every((a) => doneIds.has(a.id))) w++;
  return w;
}

export function isWeekComplete(week: number, doneIds: ReadonlySet<string>): boolean {
  return activitiesOfWeek(week).every((a) => doneIds.has(a.id));
}

// ── Récompenses (règle 4 : acquises pour toujours) ───────────────────────────
export type RewardId =
  | 'fiche_identite'
  | 'bilan_mi_parcours'
  | 'boite_a_outils'
  | 'certificat'
  | 'lettre_un_an'
  | 'pack_dehors'
  | 'book_thrive';

export type Reward = {
  id: RewardId;
  label: string;
  /** Ce qui déclenche l'obtention. */
  trigger:
    | { kind: 'week_complete'; week: number }
    | { kind: 'activity_done'; activity: string }
    | { kind: 'moments'; count: number }
    | { kind: 'subscription_months'; months: number };
  bonus?: string;
  /** false = contenu pas encore produit : ne pas afficher. */
  available: boolean;
};

export const REWARDS: Reward[] = [
  { id: 'fiche_identite', label: 'La Fiche Identité de {prenom}', trigger: { kind: 'week_complete', week: 1 }, available: true },
  { id: 'bilan_mi_parcours', label: 'Le bilan de mi-parcours', trigger: { kind: 'week_complete', week: 7 }, available: true },
  { id: 'boite_a_outils', label: 'La Carte Ma Boîte à Outils de {prenom}', trigger: { kind: 'week_complete', week: 11 }, available: true },
  { id: 'lettre_un_an', label: 'La lettre à ouvrir dans un an', trigger: { kind: 'activity_done', activity: 'ACT-1302' }, available: true },
  { id: 'certificat', label: 'Le Certificat THRIVE Maison', trigger: { kind: 'week_complete', week: 13 }, bonus: '1 mois offert', available: true },
  { id: 'pack_dehors', label: 'Le pack « Dehors »', trigger: { kind: 'moments', count: 25 }, available: false },
  { id: 'book_thrive', label: 'Le Book THRIVE Maison, imprimé', trigger: { kind: 'subscription_months', months: 12 }, available: true },
];

/** Récompenses nouvellement gagnées. Ne renvoie jamais de récompense à retirer. */
export function newlyEarned(input: {
  alreadyEarned: ReadonlySet<RewardId>;
  doneIds: ReadonlySet<string>;
  momentsTotal: number;
  subscriptionMonths: number;
}): RewardId[] {
  return REWARDS.filter((r) => r.available && !input.alreadyEarned.has(r.id))
    .filter((r) => {
      const t = r.trigger;
      if (t.kind === 'week_complete') return isWeekComplete(t.week, input.doneIds);
      if (t.kind === 'activity_done') return input.doneIds.has(t.activity);
      if (t.kind === 'moments') return input.momentsTotal >= t.count;
      return input.subscriptionMonths >= t.months;
    })
    .map((r) => r.id);
}

// ── Répétition (spec §8) ─────────────────────────────────────────────────────
/** Délai avant qu'une fiche revienne, selon la dernière note. null = ne revient pas. */
export function cooldownDays(rating: Moment['rating']): number | null {
  if (rating === 5) return 14;
  if (rating === 4) return 30;
  if (rating === 3) return 90;
  if (rating === 1 || rating === 2) return null;
  return 60;
}

function lastMomentOf(id: string, moments: Moment[]): Moment | null {
  return moments.filter((m) => m.activity_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function canRepeat(id: string, moments: Moment[], now: Date): boolean {
  const last = lastMomentOf(id, moments);
  if (!last) return true;
  const cd = cooldownDays(last.rating);
  if (cd === null) return false;
  return (now.getTime() - new Date(last.created_at).getTime()) / 864e5 >= cd;
}

// ── La carte du soir (moteur V1 déterministe, spec §7) ───────────────────────
export type TonightInput = {
  firstName: string;
  band: AgeBand;
  declaredDuration: Duration;
  place: Place;
  parentEnergy: ParentEnergy | null;
  childMood: ChildMood | null;
  moments: Moment[];
  /** Refus consécutifs de l'enfant ce soir ou aux derniers moments proposés. */
  consecutiveRefusals: number;
  now: Date;
  pool?: P3Activity[];
};

export type TonightPick = { activity: P3Activity; reason: string } | null;

/**
 * Règle de priorité :
 *   1. la prochaine fiche non faite de la semaine en cours (le programme) ;
 *   2. sinon une fiche déjà ouverte, rejouable, choisie par score ;
 *   3. après 2 refus : une fiche « anti-refus ».
 * La ligne `reason` EST le produit (spec §7) : elle rend la personnalisation visible.
 */
export function pickTonight(input: TonightInput): TonightPick {
  const pool = input.pool ?? P3_ACTIVITIES;
  const done = new Set(input.moments.map((m) => m.activity_id));
  const open = unlockedWeeks(done);
  const fits = (a: P3Activity) =>
    a.week <= open &&
    effectiveDuration(a, input.declaredDuration) !== null &&
    (input.place === 'voiture' ? a.car_ok : a.places.includes(input.place) || a.places.includes('partout'));

  if (input.consecutiveRefusals >= 2) {
    const soft = pool.filter((a) => fits(a) && a.anti_refusal && canRepeat(a.id, input.moments, input.now));
    if (soft.length) return { activity: soft[0], reason: 'Celle-ci marche même les soirs où il dit non.' };
  }

  const next = pool.filter((a) => a.week === open && !done.has(a.id) && fits(a)).sort((a, b) => a.rank - b.rank)[0];
  if (next) {
    const reason =
      input.place === 'voiture'
        ? `Pour la route : la suite de la semaine ${next.week}.`
        : next.rank === 1
          ? `Semaine ${next.week} : ${getWeek(next.week)?.title ?? ''}.`
          : `La suite de votre semaine ${next.week}.`;
    return { activity: next, reason };
  }

  const worked = new Map<string, number>();
  for (const m of input.moments) {
    const a = pool.find((x) => x.id === m.activity_id);
    if (a) worked.set(a.pillar_main, (worked.get(a.pillar_main) ?? 0) + 1);
  }
  const scored = pool
    .filter((a) => fits(a) && canRepeat(a.id, input.moments, input.now))
    .map((a) => {
      let s = 0;
      s += 30 - Math.min(30, (worked.get(a.pillar_main) ?? 0) * 5);
      if (input.parentEnergy && a.parent_energy === input.parentEnergy) s += 20;
      if (input.childMood && a.child_moods.includes(input.childMood)) s += 15;
      const last = lastMomentOf(a.id, input.moments);
      if (last?.rating && last.rating >= 4) s += 10;
      if (a.specific_materials) s -= 5;
      return { a, s, last };
    })
    .sort((x, y) => y.s - x.s);
  const best = scored[0];
  if (!best) return null;

  let reason = 'Une de celles que vous avez déjà ouvertes.';
  if (best.last?.rating === 5) reason = 'On refait celle-ci : elle avait bien marché.';
  else if (input.childMood === 'fatigue' && best.a.child_moods.includes('fatigue'))
    reason = `Parce que ${input.firstName} est fatigué·e ce soir.`;
  else if (input.parentEnergy === 'basse' && best.a.parent_energy === 'basse')
    reason = 'Une qui ne demande presque rien de votre côté.';
  return { activity: best.a, reason };
}

// ── Notifications : invitations, jamais de dette (règle 2) ───────────────────
export const NUDGES: string[] = [
  '{prenom} a dix minutes de libre ce soir ?',
  'Un moment avec {prenom} ce soir ? Tout est prêt.',
  'Dix minutes, une phrase à dire, rien à préparer.',
  'Ce soir, la suite de votre semaine {semaine} vous attend.',
];

/** Mots interdits dans toute notification ou tout écran de relance. Verrouillé par test. */
export const GUILT_PATTERNS: RegExp[] = [
  /s[ée]rie/i,
  /perdu/i,
  /manqu/i,
  /rat[ée]/i,
  /oubli/i,
  /depuis \d+ jours/i,
  /derni[èe]re chance/i,
  /en retard/i,
  /\b0 moment/i,
  /interromp/i,
];

export function isGuiltFree(text: string): boolean {
  return !GUILT_PATTERNS.some((re) => re.test(text));
}

export function renderNudge(template: string, vars: { prenom: string; semaine?: number }): string {
  const out = template.replace(/\{prenom\}/g, vars.prenom).replace(/\{semaine\}/g, String(vars.semaine ?? ''));
  if (!isGuiltFree(out)) throw new Error(`Notification culpabilisante refusée : « ${out} »`);
  return out;
}

// ── Rappel (temps 2 des 5 temps, 20 s) ───────────────────────────────────────
export function recallLine(firstName: string, lastKeptPhrase: string | null): string | null {
  if (!lastKeptPhrase) return null;
  return `La dernière fois, ${firstName} avait dit « ${lastKeptPhrase} ».`;
}

/** Remplace {date_ouverture} dans les libellés « À garder » (lettre scellée). */
export function renderCaptureLabel(label: string, sealedAt: Date): string {
  const open = new Date(sealedAt);
  open.setFullYear(open.getFullYear() + 1);
  return label.replace('{date_ouverture}', open.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }));
}
