import { describe, expect, it } from 'vitest';
import { hasFinalPoint, lsssDelta, shareMessage, wellbeingSeries } from './logic';

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
});
