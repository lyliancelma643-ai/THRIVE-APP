// ─────────────────────────────────────────────────────────────────────────────
// Maison façon plateforme de streaming : les rangées de l'accueil et les filtres
// du catalogue. Règles pures, sans I/O, testées dans shelves.test.ts.
//
// Liberté totale : aucune rangée ne cache une fiche parce que sa semaine n'est
// pas « ouverte » — le programme recommande un ordre, il ne l'impose pas.
// Anti-culpabilité (R3) : les titres invitent, ils ne comptent jamais un manque ;
// une rangée vide disparaît au lieu d'afficher « 0 ».
// ─────────────────────────────────────────────────────────────────────────────

import type { AgeBand, DayMoment, P3Activity } from './parse';
import { getWeek } from './index';

export type Shelf = {
  id: string;
  title: string;
  /** Le message de recommandation affiché sous le titre. */
  subtitle: string;
  items: P3Activity[];
};

export type ShelfInput = {
  pool: P3Activity[];
  firstName: string;
  openWeek: number;
  doneIds: ReadonlySet<string>;
  /** Dernière note connue par fiche (la plus récente d'abord dans p3_moments). */
  lastRating: ReadonlyMap<string, number | null>;
  favoris: ReadonlySet<string>;
  deCote: ReadonlySet<string>;
  now: Date;
  /** Fiche déjà mise en avant dans l'affiche : retirée des premières rangées. */
  heroId?: string | null;
};

export const BAND_LABELS: Record<AgeBand, string> = {
  '8-11': '8–11 ans',
  '12-14': '12–14 ans',
  '15-17': '15–17 ans',
};

/** Le créneau de la journée, pour la rangée « Parfait pour ce soir ». */
export function daySlot(now: Date): Exclude<DayMoment, 'indifferent'> {
  const day = now.getDay();
  if (day === 0 || day === 6) return 'week-end';
  const h = now.getHours();
  if (h < 12) return 'matin';
  if (h < 18) return 'apres-ecole';
  return 'soir';
}

const SLOT_TITLES: Record<Exclude<DayMoment, 'indifferent'>, string> = {
  matin: 'Parfait pour ce matin',
  'apres-ecole': 'Parfait après l’école',
  soir: 'Parfait pour ce soir',
  'week-end': 'Parfait pour ce week-end',
};

// ── Filtres du catalogue (et des rangées thématiques) ────────────────────────
export type FilterId =
  | 'tout'
  | 'nouvelles'
  | 'rien'
  | 'a_plat'
  | 'non'
  | 'voiture'
  | 'bouger'
  | 'dehors'
  | 'trente'
  | 'favoris'
  | 'vecues';

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'tout', label: 'Tout' },
  { id: 'nouvelles', label: 'Pas encore faites' },
  { id: 'rien', label: 'Rien à préparer' },
  { id: 'a_plat', label: 'Peu d’énergie' },
  { id: 'non', label: 'Quand il dit non' },
  { id: 'voiture', label: 'En voiture' },
  { id: 'bouger', label: 'Pour bouger' },
  { id: 'dehors', label: 'Dehors' },
  { id: 'trente', label: '30 minutes' },
  { id: 'favoris', label: 'Favoris' },
  { id: 'vecues', label: 'Déjà vécues' },
];

export function matchesFilter(
  a: P3Activity,
  f: FilterId,
  s: { doneIds: ReadonlySet<string>; favoris: ReadonlySet<string> }
): boolean {
  switch (f) {
    case 'nouvelles':
      return !s.doneIds.has(a.id);
    case 'rien':
      return a.materials.length === 0;
    case 'a_plat':
      return a.parent_energy === 'basse';
    case 'non':
      return a.anti_refusal;
    case 'voiture':
      return a.car_ok;
    case 'bouger':
      return a.movement !== 'assis';
    case 'dehors':
      return a.places.includes('exterieur') || a.places.includes('partout');
    case 'trente':
      return a.durations.includes(30);
    case 'favoris':
      return s.favoris.has(a.id);
    case 'vecues':
      return s.doneIds.has(a.id);
    default:
      return true;
  }
}

const byProgramme = (a: P3Activity, b: P3Activity) => a.week - b.week || a.rank - b.rank;

/** Recommandation douce : les fiches pas encore vécues d'abord, puis l'ordre du programme. */
function freshFirst(items: P3Activity[], doneIds: ReadonlySet<string>): P3Activity[] {
  return [...items].sort((a, b) => Number(doneIds.has(a.id)) - Number(doneIds.has(b.id)) || byProgramme(a, b));
}

const PHASES = [
  { id: 'ANCRER', label: 'Ancrer' },
  { id: 'DEVELOPPER', label: 'Développer' },
  { id: 'INTEGRER', label: 'Intégrer' },
] as const;

function weekSpan(items: P3Activity[]): string {
  const weeks = items.map((a) => a.week);
  const lo = Math.min(...weeks);
  const hi = Math.max(...weeks);
  return lo === hi ? `Semaine ${lo}` : `Semaines ${lo} à ${hi}`;
}

/** Les rangées de l'accueil, dans l'ordre d'affichage. Une rangée vide n'est pas renvoyée. */
export function buildShelves(input: ShelfInput): Shelf[] {
  const { firstName, doneIds, favoris, deCote, lastRating } = input;
  const visible = input.pool.filter((a) => !deCote.has(a.id));
  const notHero = visible.filter((a) => a.id !== input.heroId);
  const f = (id: FilterId) => notHero.filter((a) => matchesFilter(a, id, { doneIds, favoris }));
  const shelves: Shelf[] = [];

  const week = getWeek(input.openWeek);
  shelves.push({
    id: 'semaine',
    title: `Votre semaine ${input.openWeek}${week ? ` · ${week.title}` : ''}`,
    subtitle: 'L’ordre que le programme conseille. Rien ne vous y oblige.',
    items: visible.filter((a) => a.week === input.openWeek).sort(byProgramme),
  });

  // « Parce que … a aimé » : la dernière fiche notée 4 ou 5, et son pilier.
  const lovedId = [...lastRating.entries()].find(([, r]) => (r ?? 0) >= 4)?.[0];
  const loved = lovedId ? input.pool.find((a) => a.id === lovedId) : null;
  if (loved) {
    shelves.push({
      id: 'parce-que',
      title: `Parce que ${firstName} a aimé « ${loved.title} »`,
      subtitle: 'Le même ressort, sous un autre angle.',
      items: freshFirst(
        notHero.filter((a) => a.id !== loved.id && (a.pillar_main === loved.pillar_main || a.pillars_secondary.includes(loved.pillar_main))),
        doneIds
      ),
    });
  }

  const slot = daySlot(input.now);
  shelves.push({
    id: 'creneau',
    title: SLOT_TITLES[slot],
    subtitle: 'Celles qui tombent bien à ce moment de la journée.',
    items: freshFirst(notHero.filter((a) => a.moments.includes(slot)), doneIds),
  });

  shelves.push(
    { id: 'rien', title: 'Rien à préparer', subtitle: 'Vous pouvez commencer dans la minute.', items: freshFirst(f('rien'), doneIds) },
    {
      id: 'a_plat',
      title: 'Les soirs où vous êtes à plat',
      subtitle: 'Elles ne demandent presque rien de votre côté.',
      items: freshFirst(f('a_plat'), doneIds),
    },
    {
      id: 'non',
      title: 'Quand il dit non',
      subtitle: 'Elles passent même quand l’envie n’est pas là.',
      items: freshFirst(f('non'), doneIds),
    },
    { id: 'voiture', title: 'Pour la route', subtitle: 'Tout se fait à voix haute.', items: freshFirst(f('voiture'), doneIds) },
    { id: 'bouger', title: 'Pour bouger un peu', subtitle: 'Debout, en mouvement.', items: freshFirst(f('bouger'), doneIds) },
    {
      id: 'trente',
      title: 'Vous avez trente minutes ?',
      subtitle: 'Celles qui s’étirent jusqu’à trente minutes.',
      items: freshFirst(f('trente'), doneIds),
    }
  );

  shelves.push({
    id: 'preferees',
    title: `Les préférées de ${firstName}`,
    subtitle: 'À refaire : elles avaient bien marché.',
    items: visible.filter((a) => (lastRating.get(a.id) ?? 0) >= 4),
  });
  shelves.push({ id: 'favoris', title: 'Vos favoris', subtitle: 'Celles que vous avez gardées.', items: visible.filter((a) => favoris.has(a.id)) });

  for (const p of PHASES) {
    const items = visible.filter((a) => a.phase === p.id).sort(byProgramme);
    if (items.length) shelves.push({ id: `phase-${p.id}`, title: `${p.label} · ${weekSpan(items).toLowerCase()}`, subtitle: 'Toutes les fiches de cette étape.', items });
  }

  shelves.push({
    id: 'de_cote',
    title: 'Mises de côté',
    subtitle: 'Elles restent là, pour plus tard.',
    items: input.pool.filter((a) => deCote.has(a.id)).sort(byProgramme),
  });

  return shelves.filter((s) => s.items.length > 0);
}
