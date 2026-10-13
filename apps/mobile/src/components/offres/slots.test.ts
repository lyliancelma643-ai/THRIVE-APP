// Lancer : cd apps/web && npx vitest run --root ../mobile src/components/offres
import { describe, expect, it } from 'vitest';
import { bookLabel, groupSlotsByDay } from './slots';

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).toISOString();

describe('créneaux de l’appel de 15 min', () => {
  it('regroupe par jour, trie les jours et les heures', () => {
    const days = groupSlotsByDay([
      { iso: at(14, 18, 30) },
      { iso: at(13, 17) },
      { iso: at(14, 17, 30), available: false },
    ]);
    expect(days.map((d) => d.dayNum)).toEqual([13, 14]);
    expect(days[1].slots.map((s) => s.time)).toEqual(['17 h 30', '18 h 30']);
    expect(days[1].slots[0].available).toBe(false);
    expect(days[1].slots[1].available).toBe(true);
  });

  it('libellés français', () => {
    const [day] = groupSlotsByDay([{ iso: at(14, 18, 30) }]);
    expect(day.weekday).toBe('mer.');
    expect(day.long).toBe('Mercredi 14 octobre');
    expect(day.month).toBe('Octobre 2026');
    expect(bookLabel(day, day.slots[0])).toBe('Réserver mercredi 14 oct. · 18 h 30');
  });

  it('sans créneau choisi, ou date illisible', () => {
    expect(bookLabel(null, null)).toBe('Choisis un créneau');
    expect(groupSlotsByDay([{ iso: 'pas une date' }])).toEqual([]);
  });
});
