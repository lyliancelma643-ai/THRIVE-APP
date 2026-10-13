import { describe, expect, it } from 'vitest';
import { hasFinalPoint, lsssDelta, lsssPlot, shareMessage, wellbeingPlot, wellbeingSeries } from './logic';

const pts = [
  { moment: 'BASELINE' as const, created_at: '2026-01-01', value: 56 },
  { moment: 'MID' as const, created_at: '2026-02-01', value: 67 },
  { moment: 'FINAL' as const, created_at: '2026-03-01', value: 79 },
];

describe('fin de parcours', () => {
  it('détecte le bilan final', () => {
    expect(hasFinalPoint(pts)).toBe(true);
    expect(hasFinalPoint(pts.slice(0, 2))).toBe(false);
  });
  it('calcule l’écart depuis le départ', () => {
    expect(lsssDelta(pts)).toBe(23);
    expect(lsssDelta(pts.slice(0, 1))).toBeNull();
    expect(lsssDelta([])).toBeNull();
  });
  it('ordonne et borne le bien-être', () => {
    const s = wellbeingSeries([
      { session_number: 3, value: 3 },
      { session_number: 1, value: 2 },
      { session_number: 14, value: 5 },
    ]);
    expect(s.map((p) => p.session_number)).toEqual([1, 3]);
  });
  it('compose le message de partage', () => {
    expect(shareMessage('Léo')).toContain('Léo');
  });
  it('trace la courbe LSSS dans le repère du canevas', () => {
    const plot = lsssPlot(pts);
    expect(plot.points.map((p) => [p.x, p.y])).toEqual([[24, 88], [169, 66], [314, 42]]);
    expect(plot.ticks.map((t) => t.y)).toEqual([100, 60, 20]);
  });
  it('adapte l’échelle quand une valeur sort du cadre', () => {
    const plot = lsssPlot([{ moment: 'BASELINE', created_at: '2026-01-01', value: 20 }, { moment: 'FINAL', created_at: '2026-03-01', value: 95 }]);
    for (const p of plot.points) {
      expect(p.y).toBeGreaterThanOrEqual(26);
      expect(p.y).toBeLessThanOrEqual(118);
    }
  });
  it('trace le bien-être : séance 1 à gauche, valeur 5 en haut', () => {
    const plot = wellbeingPlot([{ session_number: 1, value: 1 }, { session_number: 13, value: 5 }]);
    expect(plot[0]).toMatchObject({ x: 4, y: 52 });
    expect(plot[1].x).toBeCloseTo(334, 5);
    expect(plot[1].y).toBe(12);
  });
});
