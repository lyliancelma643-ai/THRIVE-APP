import { describe, expect, it } from 'vitest';
import { P3_ACTIVITIES, isGuiltFree } from './index';
import { FILTERS, buildShelves, daySlot, matchesFilter, type ShelfInput } from './shelves';
import { parseBand } from './app';

const base = (extra: Partial<ShelfInput> = {}): ShelfInput => ({
  pool: P3_ACTIVITIES,
  firstName: 'Léa',
  openWeek: 1,
  doneIds: new Set(),
  lastRating: new Map(),
  favoris: new Set(),
  deCote: new Set(),
  now: new Date('2026-09-23T19:30:00'), // mercredi soir
  ...extra,
});

describe('Maison façon streaming — rangées', () => {
  it('première visite : la semaine 1 en tête, puis les rangées thématiques, sans rangée vide', () => {
    const shelves = buildShelves(base());
    expect(shelves[0].id).toBe('semaine');
    expect(shelves[0].items.map((a) => a.week)).toEqual([1, 1, 1]);
    expect(shelves.find((s) => s.id === 'creneau')?.title).toBe('Parfait pour ce soir');
    expect(shelves.every((s) => s.items.length > 0)).toBe(true);
    // Rien à « refaire » ni de favoris tant qu'il n'y a rien.
    expect(shelves.some((s) => s.id === 'preferees' || s.id === 'favoris' || s.id === 'parce-que')).toBe(false);
  });

  it('liberté totale : les rangées par étape couvrent les 39 fiches, semaine ouverte ou non', () => {
    const shelves = buildShelves(base());
    const phaseIds = new Set(shelves.filter((s) => s.id.startsWith('phase-')).flatMap((s) => s.items.map((a) => a.id)));
    expect(phaseIds.size).toBe(P3_ACTIVITIES.length);
    expect(shelves.find((s) => s.id === 'non')!.items.some((a) => a.week > 1)).toBe(true);
  });

  it('les fiches pas encore vécues passent devant, la fiche de l’affiche n’est pas répétée', () => {
    const first = buildShelves(base()).find((s) => s.id === 'rien')!.items[0];
    const shelves = buildShelves(base({ doneIds: new Set([first.id]), heroId: 'ACT-0102' }));
    const rien = shelves.find((s) => s.id === 'rien')!.items;
    expect(rien[rien.length - 1].id).toBe(first.id);
    expect(rien.some((a) => a.id === 'ACT-0102')).toBe(false);
  });

  it('« Parce que Léa a aimé » suit la dernière fiche bien notée', () => {
    const loved = P3_ACTIVITIES.find((a) => a.id === 'ACT-0101')!;
    const shelves = buildShelves(base({ lastRating: new Map([['ACT-0101', 5]]) }));
    const because = shelves.find((s) => s.id === 'parce-que')!;
    expect(because.title).toBe(`Parce que Léa a aimé « ${loved.title} »`);
    expect(because.items.every((a) => a.id !== loved.id)).toBe(true);
    expect(shelves.find((s) => s.id === 'preferees')!.items.map((a) => a.id)).toEqual(['ACT-0101']);
  });

  it('une fiche mise de côté ne sort plus que dans « Mises de côté »', () => {
    const shelves = buildShelves(base({ deCote: new Set(['ACT-0101']) }));
    for (const s of shelves) {
      expect(s.items.some((a) => a.id === 'ACT-0101')).toBe(s.id === 'de_cote');
    }
  });

  it('aucun titre ni message ne culpabilise (R3)', () => {
    const shelves = buildShelves(
      base({ doneIds: new Set(['ACT-0101']), lastRating: new Map([['ACT-0101', 4]]), favoris: new Set(['ACT-0203']), deCote: new Set(['ACT-0301']) })
    );
    for (const s of shelves) {
      expect(isGuiltFree(s.title), s.title).toBe(true);
      expect(isGuiltFree(s.subtitle), s.subtitle).toBe(true);
    }
    for (const f of FILTERS) expect(isGuiltFree(f.label)).toBe(true);
  });

  it('créneau du jour et filtres', () => {
    expect(daySlot(new Date('2026-09-26T10:00:00'))).toBe('week-end');
    expect(daySlot(new Date('2026-09-23T08:00:00'))).toBe('matin');
    expect(daySlot(new Date('2026-09-23T16:30:00'))).toBe('apres-ecole');
    const s = { doneIds: new Set<string>(), favoris: new Set<string>() };
    expect(P3_ACTIVITIES.filter((a) => matchesFilter(a, 'voiture', s)).every((a) => a.car_ok)).toBe(true);
    expect(P3_ACTIVITIES.filter((a) => matchesFilter(a, 'tout', s))).toHaveLength(39);
    expect(parseBand('15-17')).toBe('15-17');
    expect(parseBand('6-7')).toBeNull();
  });
});
