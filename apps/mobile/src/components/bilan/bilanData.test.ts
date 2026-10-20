import { describe, it, expect } from 'vitest';
import { curveGeometry, dayLabel, groupByDay, isAccentKey, parseJersey, skillLabel } from './bilanData';

describe('bilanData', () => {
  it('libellé de compétence', () => expect(skillLabel('self_control')).toBe('Self control'));
  it('numéro de maillot', () => {
    expect(parseJersey('7')).toBe(7);
    expect(parseJersey('1000')).toBeNull();
    expect(parseJersey('a')).toBeNull();
    expect(parseJersey('')).toBeNull();
  });
  it('accent valide', () => {
    expect(isAccentKey('teal')).toBe(true);
    expect(isAccentKey('rose')).toBe(false);
  });
  it('géométrie : un point centré, plusieurs points croissants', () => {
    expect(curveGeometry([70], 300, 150).points[0].x).toBe(150);
    const g = curveGeometry([60, 70, 80], 300, 150);
    expect(g.points[0].x).toBeLessThan(g.points[2].x);
    expect(g.points[0].y).toBeGreaterThan(g.points[2].y);
  });
  it('regroupe par jour', () => {
    const g = groupByDay([
      { created_at: '2026-10-12T10:00:00' },
      { created_at: '2026-10-12T08:00:00' },
      { created_at: '2026-10-11T08:00:00' },
    ]);
    expect(g.map((x) => x.items.length)).toEqual([2, 1]);
  });
  it('libellé de jour', () => {
    const now = new Date(2026, 9, 12, 15);
    expect(dayLabel('2026-10-12', now)).toBe('Aujourd’hui');
    expect(dayLabel('2026-10-11', now)).toBe('Hier');
  });
});
