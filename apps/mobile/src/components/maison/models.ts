// Construit les modèles de vue des écrans Maison depuis les vraies données (p3, moments, accès).
// Logique pure : aucune dépendance React ; la sélection du moment du soir reste dans logic.ts.
import type { IconName } from '../../design';
import { BAND_LABELS, byProgramme, matchesFilter, weekSpan, type FilterId } from '../../../../web/src/lib/p3-moments/shelves';
import {
  getActivity, getWeek, isVisible, resolveActivity,
  type AgeBand, type Duration, type P3Activity,
} from '../../lib/p3';
import { vignetteIdFor, vignetteLabel } from '../../lib/vignettes';
import { MOVEMENT_LABEL, formatDay, materialsLabel } from './helpers';
import type { ParcoursWeek, Tonight } from './logic';
import { reasonLine } from './logic';
import type {
  CarnetVM, FicheVM, HomeChip, HomeVM, MomentVM, ParcoursVM, PosterVM,
} from './viewModels';

export { BAND_LABELS };

export const durationsText = (a: Pick<P3Activity, 'durations'>) => `${a.durations.join(' · ')} min`;

export function posterOf(a: P3Activity, doneIds: ReadonlySet<string>, opts: { complement?: boolean; locked?: boolean } = {}): PosterVM {
  return {
    id: a.id,
    title: a.title,
    durations: opts.complement && a.programme === 'complement' ? `${durationsText(a)} · bonus` : durationsText(a),
    vignetteId: vignetteIdFor(a),
    done: doneIds.has(a.id),
    locked: opts.locked,
  };
}

// ── « Selon ton moment » et phases (accueil) ────────────────────────────────
export const MOMENT_CHIPS: (HomeChip & { filter: FilterId | 'weekend'; note: string })[] = [
  { key: 'rien', label: 'Rien à préparer', filter: 'rien', note: 'Tu peux commencer dans la minute.' },
  { key: 'a_plat', label: 'Soir à plat', filter: 'a_plat', note: 'Elles ne demandent presque rien de ton côté.' },
  { key: 'non', label: 'Il dit non', filter: 'non', note: 'Elles passent même quand l’envie n’est pas là.' },
  { key: 'voiture', label: 'En voiture', filter: 'voiture', note: 'Tout se fait à voix haute.' },
  { key: 'bouger', label: 'Bouger', filter: 'bouger', note: 'Debout, en mouvement.' },
  { key: 'trente', label: '30 minutes', filter: 'trente', note: 'Celles qui s’étirent jusqu’à trente minutes.' },
  { key: 'weekend', label: 'Week-end', filter: 'weekend', note: 'Celles qui tombent bien un week-end.' },
];

/** Fiches visibles pour une tranche d'âge, pas encore vécues d'abord, puis l'ordre du programme. */
function freshFirst(items: P3Activity[], doneIds: ReadonlySet<string>): P3Activity[] {
  return [...items].sort((a, b) => Number(doneIds.has(a.id)) - Number(doneIds.has(b.id)) || byProgramme(a, b));
}

export function momentShelfItems(pool: P3Activity[], key: string, doneIds: ReadonlySet<string>, openWeek: number, heroId: string | null): P3Activity[] {
  const chip = MOMENT_CHIPS.find((c) => c.key === key) ?? MOMENT_CHIPS[0];
  const visible = pool.filter((a) => isVisible(a, openWeek) && a.id !== heroId);
  const match =
    chip.filter === 'weekend'
      ? visible.filter((a) => a.moments.includes('week-end'))
      : visible.filter((a) => matchesFilter(a, chip.filter as FilterId, { doneIds, favoris: new Set() }));
  return freshFirst(match, doneIds).slice(0, 12);
}

export const PHASE_CHIPS = [
  { key: 'ANCRER', label: 'Ancrer', tail: 'poser les bases' },
  { key: 'DEVELOPPER', label: 'Développer', tail: 'le cœur du travail' },
  { key: 'INTEGRER', label: 'Intégrer', tail: 'faire durer' },
] as const;

export function phaseShelfItems(pool: P3Activity[], key: string, openWeek: number): P3Activity[] {
  return pool.filter((a) => isVisible(a, openWeek) && a.phase === key).sort(byProgramme);
}

export function phaseOfWeek(week: number): string {
  return getWeek(week)?.phase ?? 'ANCRER';
}

/** Accès / essai → bandeau du haut de l'affiche (jamais un prix, jamais un lien de paiement). */
export function bannerFor(input: { sourceMaison?: string | null; isTrial: boolean; expirationDate: string | null; now: Date }): HomeVM['banner'] {
  if (input.sourceMaison === 'pack') return { kind: 'included', label: 'Inclus avec ton programme' };
  if (input.isTrial && input.expirationDate) {
    const days = Math.ceil((new Date(input.expirationDate).getTime() - input.now.getTime()) / 86_400_000);
    if (days > 1) return { kind: 'trial', label: `Essai gratuit · encore ${days} jours` };
    if (days === 1) return { kind: 'trial', label: 'Essai gratuit · encore 1 jour' };
    return { kind: 'trial', label: 'Essai gratuit · dernier jour' };
  }
  return null;
}

type HomeInput = {
  childName: string;
  tonight: Tonight;
  duration: number;
  pool: P3Activity[];
  doneIds: ReadonlySet<string>;
  momentsTotal: number;
  weekDone: number;
  weekTarget: number;
  momentChip: string;
  phaseChip: string;
  banner: HomeVM['banner'];
  invite: boolean;
  carnet: { created_at: string; activity_id: string; kept_phrase: string | null }[];
};

export function buildHomeVM(i: HomeInput): HomeVM {
  const a = i.tonight.activity;
  const week = i.tonight.openWeek;
  const momentItems = momentShelfItems(i.pool, i.momentChip, i.doneIds, week, a.id);
  const chip = MOMENT_CHIPS.find((c) => c.key === i.momentChip) ?? MOMENT_CHIPS[0];
  const phaseItems = phaseShelfItems(i.pool, i.phaseChip, week);
  const phase = PHASE_CHIPS.find((p) => p.key === i.phaseChip) ?? PHASE_CHIPS[0];
  const movementGlyph: IconName = a.movement === 'assis' ? 'person' : 'runner';
  return {
    childName: i.childName,
    childInitial: i.childName.trim().charAt(0).toUpperCase() || '·',
    banner: i.banner,
    hero: {
      id: a.id,
      vignetteId: vignetteIdFor(a),
      vignetteLabel: vignetteLabel(a),
      title: a.title,
      reason: reasonLine(i.tonight),
      minutes: i.duration,
      recommendedLabel: `Recommandé pour ${i.childName} ce soir`,
      chips: [
        { glyph: 'timer', label: `${i.duration} min` },
        { glyph: movementGlyph, label: MOVEMENT_LABEL[a.movement] },
        { glyph: 'gift', label: materialsLabel(a) },
      ],
    },
    counter: { total: i.momentsTotal, done: i.weekDone, target: i.weekTarget },
    weekNote: `Semaine ${week} · ${i.tonight.weekTitle}. Les trois premières suffisent.`,
    weekPosters: i.tonight.weekActivities.map((x) => posterOf(x, i.doneIds)),
    moments: momentItems.length
      ? {
          title: 'Selon ton moment',
          actionLabel: 'Tout voir',
          chips: MOMENT_CHIPS.map(({ key, label }) => ({ key, label })),
          activeChip: chip.key,
          note: chip.note,
          posters: momentItems.map((x) => posterOf(x, i.doneIds)),
        }
      : null,
    phases: phaseItems.length
      ? {
          title: 'Tout le parcours',
          actionLabel: 'Le programme',
          chips: PHASE_CHIPS.map(({ key, label }) => ({ key, label })),
          activeChip: phase.key,
          note: `${weekSpan(phaseItems)} : ${phase.tail}.`,
          posters: phaseItems.slice(0, 12).map((x) => posterOf(x, i.doneIds)),
        }
      : null,
    allLabel: `Voir les ${i.pool.length} activités, triées par âge`,
    invite: i.invite,
    carnet: i.carnet.slice(0, 3).map((m) => ({
      id: `${m.activity_id}-${m.created_at}`,
      dateLabel: formatDay(m.created_at),
      title: getActivity(m.activity_id)?.title ?? 'Un moment ensemble',
      phrase: m.kept_phrase,
    })),
    carnetEmptyText: `Vos moments vécus avec ${i.childName} s’afficheront ici.`,
  };
}

// ── Parcours (K2) ───────────────────────────────────────────────────────────
export const PARCOURS_FILTERS: Record<string, { title: string; subtitle: string; filter: FilterId | 'weekend' }> = {
  refus: { title: 'Quand il dit non', subtitle: 'Des moments qui marchent même les soirs où il dit non.', filter: 'non' },
  non: { title: 'Quand il dit non', subtitle: 'Des moments qui marchent même les soirs où il dit non.', filter: 'non' },
  rien: { title: 'Rien à préparer', subtitle: 'Tu peux commencer dans la minute.', filter: 'rien' },
  a_plat: { title: 'Soir à plat', subtitle: 'Elles ne demandent presque rien de ton côté.', filter: 'a_plat' },
  voiture: { title: 'En voiture', subtitle: 'Tout se fait à voix haute.', filter: 'voiture' },
  bouger: { title: 'Pour bouger', subtitle: 'Debout, en mouvement.', filter: 'bouger' },
  trente: { title: '30 minutes', subtitle: 'Celles qui s’étirent jusqu’à trente minutes.', filter: 'trente' },
  weekend: { title: 'Week-end', subtitle: 'Celles qui tombent bien un week-end.', filter: 'weekend' },
};

export function buildParcoursVM(input: {
  weeks: ParcoursWeek[];
  bonus: P3Activity[];
  poolSize: number;
  doneIds: ReadonlySet<string>;
  filter: string | undefined;
  filtered: P3Activity[];
}): ParcoursVM {
  const f = input.filter ? PARCOURS_FILTERS[input.filter] : undefined;
  if (f) {
    return { title: f.title, subtitle: f.subtitle, weeks: [], bonus: [], flat: input.filtered.map((a) => posterOf(a, input.doneIds)) };
  }
  return {
    title: 'Tout le parcours',
    subtitle: `13 semaines · ${input.poolSize} activités. Les trois premières de chaque semaine suffisent ; les autres vont plus loin.`,
    flat: null,
    weeks: input.weeks.map((w) => ({
      week: w.week,
      title: w.title,
      state: w.state,
      posters: w.activities.map((a) => posterOf(a, input.doneIds, { complement: true, locked: w.state === 'a_venir' })),
    })),
    bonus: input.bonus.map((a) => posterOf(a, input.doneIds)),
  };
}

export function filterForParcours(pool: P3Activity[], key: string, band: AgeBand | null, doneIds: ReadonlySet<string>): P3Activity[] {
  const f = PARCOURS_FILTERS[key];
  if (!f) return [];
  const inBand = pool.filter((a) => !band || a.age_bands.includes(band));
  const match = f.filter === 'weekend'
    ? inBand.filter((a) => a.moments.includes('week-end'))
    : inBand.filter((a) => matchesFilter(a, f.filter as FilterId, { doneIds, favoris: new Set() }));
  return [...match].sort(byProgramme);
}

// ── Fiche (L) ───────────────────────────────────────────────────────────────
export function buildFicheVM(activity: P3Activity, view: NonNullable<ReturnType<typeof resolveActivity>>): FicheVM {
  const levels = activity.sources.map((s) => s.level).sort();
  const help = activity.guide.map((g) => g.help).filter((h): h is string => !!h);
  return {
    vignetteId: vignetteIdFor(activity),
    vignetteLabel: vignetteLabel(activity),
    kicker: `Semaine ${activity.week} · Moment ${activity.rank}`,
    title: view.title,
    objective: `Objectif : ${view.objective}`,
    durations: activity.durations,
    minutes: view.duration,
    opener: view.opener,
    steps: view.screen_steps?.length ? view.screen_steps : view.steps,
    extensions: view.extensions.map((e) => e.text),
    evidenceLevel: levels[0] ?? null,
    whyLine: activity.why_one_line,
    whyDetail: activity.why_detail,
    refusal: view.donts.length || help.length || activity.safety ? { help, donts: [...view.donts], safety: activity.safety } : null,
    materials: materialsLabel(activity),
    variant: view.variant,
  };
}

// ── Moment en cours (M) ─────────────────────────────────────────────────────
export function buildMomentVM(input: {
  title: string; vignetteId: string; steps: string[]; step: number; clock: string; minutes: number; ratio: number; running: boolean;
}): MomentVM {
  const total = input.steps.length;
  return {
    title: input.title,
    vignetteId: input.vignetteId,
    stepIndex: input.step,
    stepCount: total,
    stepText: input.steps[input.step] ?? '',
    clock: input.clock,
    minutes: input.minutes,
    ratio: input.ratio,
    running: input.running,
    isLast: input.step >= total - 1,
    a11yTimer: `Il reste ${input.clock} sur ${input.minutes} minutes`,
  };
}

// ── Carnet (N) ──────────────────────────────────────────────────────────────
const REWARD_GLYPH: Record<string, IconName> = {
  fiche_identite: 'idCard',
  bilan_mi_parcours: 'star',
  boite_a_outils: 'toolbox',
  lettre_un_an: 'mail',
  certificat: 'medal',
  book_thrive: 'book',
  pack_dehors: 'leaf',
};
export const rewardGlyph = (id: string): IconName => REWARD_GLYPH[id] ?? 'gift';

export function captureTitle(a: P3Activity | null): string {
  if (!a) return 'Un moment ensemble';
  const label = a.capture?.label;
  if (!label) return a.title;
  return label.split(',')[0].trim();
}

export function buildCarnetVM(input: {
  firstName: string;
  earned: { reward: { id: string; trigger: { kind: string; week?: number }; bonus?: string }; label: string }[];
  upcoming: { reward: { id: string }; label: string }[];
  kept: { activity_id: string; created_at: string; kept_phrase: string | null }[];
}): CarnetVM {
  return {
    firstName: input.firstName,
    earned: input.earned.map((e) => ({
      id: e.reward.id,
      label: e.label,
      glyph: rewardGlyph(e.reward.id),
      detail: [
        e.reward.trigger.kind === 'week_complete' ? `Semaine ${e.reward.trigger.week} complète.` : null,
        'Acquis pour toujours.',
        e.reward.bonus ?? null,
      ].filter(Boolean).join(' '),
    })),
    kept: input.kept.slice(0, 30).map((m) => {
      const a = getActivity(m.activity_id);
      return {
        id: `${m.activity_id}-${m.created_at}`,
        activityId: m.activity_id,
        vignetteId: vignetteIdFor(a),
        title: captureTitle(a),
        detail: a?.title ?? 'Un moment ensemble',
        phrase: m.kept_phrase,
      };
    }),
    objects: [
      ...input.earned.map((e) => ({ id: e.reward.id, label: e.label, glyph: rewardGlyph(e.reward.id), got: true })),
      ...input.upcoming.map((e) => ({ id: e.reward.id, label: e.label, glyph: rewardGlyph(e.reward.id), got: false })),
    ],
  };
}

export type { Duration };
