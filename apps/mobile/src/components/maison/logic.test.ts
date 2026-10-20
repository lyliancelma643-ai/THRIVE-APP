import { describe, expect, it } from 'vitest';
import { activitiesOfWeek, p3Pool } from '../../lib/p3';
import {
  buildParcours,
  carnetObjects,
  elapsedRatio,
  formatClock,
  recommendTonight,
  reasonLine,
  remainingSeconds,
  weekState,
} from './logic';

const pool = p3Pool();
const ids = (w: number) => activitiesOfWeek(w).map((a) => a.id);

describe('recommendTonight', () => {
  it('propose la première fiche de la semaine 1 sans moment vécu', () => {
    const t = recommendTonight(pool, new Set(), '8-11');
    expect(t?.openWeek).toBe(1);
    expect(t?.activity.id).toBe(activitiesOfWeek(1)[0].id);
  });
  it('ouvre la semaine N+1 quand les 3 fiches de la semaine N sont vécues', () => {
    const t = recommendTonight(pool, new Set(ids(1)), '8-11');
    expect(t?.openWeek).toBe(2);
    expect(t?.activity.week).toBe(2);
  });
  it('passe à la fiche suivante après une fiche vécue', () => {
    const [a, b] = ids(1);
    expect(recommendTonight(pool, new Set([a]), '8-11')?.activity.id).toBe(b);
  });
  it('ne renvoie jamais une impasse quand tout est vécu', () => {
    const all = new Set(pool.map((a) => a.id));
    const t = recommendTonight(pool, all, '12-14');
    expect(t?.openWeek).toBe(13);
    expect(t?.activity).toBeTruthy();
  });
  it('la ligne de raison ne contient ni série ni manque', () => {
    const t = recommendTonight(pool, new Set(), null)!;
    expect(reasonLine(t)).not.toMatch(/série|manqu|retard|perdu/i);
  });
});

describe('parcours', () => {
  it('liste 13 semaines avec états neutres', () => {
    const p = buildParcours(pool, new Set(ids(1)));
    expect(p).toHaveLength(13);
    expect(p[0].state).toBe('faite');
    expect(p[1].state).toBe('en_cours');
    expect(p[2].state).toBe('a_venir');
    expect(p.every((w) => w.activities.length >= 3)).toBe(true);
  });
  it('weekState', () => {
    expect(weekState(5, 3, new Set())).toBe('a_venir');
  });
});

describe('minuteur', () => {
  it('formate', () => {
    expect(formatClock(744)).toBe('12:24');
    expect(formatClock(-3)).toBe('0:00');
    expect(formatClock(9)).toBe('0:09');
  });
  it('ratio et secondes restantes', () => {
    expect(elapsedRatio(10 * 60_000, 20)).toBe(0.5);
    expect(elapsedRatio(99 * 60_000, 20)).toBe(1);
    expect(remainingSeconds(0, 10)).toBe(600);
    expect(remainingSeconds(11 * 60_000, 10)).toBe(0);
  });
});

describe('carnet', () => {
  it('une récompense gagnée le reste', () => {
    const o = carnetObjects(new Set(ids(1)), 3, 'Noé');
    expect(o.earned.some((e) => e.reward.id === 'fiche_identite')).toBe(true);
    expect(o.earned[0].label).toContain('Noé');
    expect(o.earned.length + o.upcoming.length).toBeGreaterThan(3);
  });
});

import { withAlpha, materialsLabel } from './helpers';
describe('helpers', () => {
  it('withAlpha', () => {
    expect(withAlpha('#f2f2f7', 0)).toBe('#f2f2f700');
    expect(withAlpha('rgba(1,2,3,1)', 0.5)).toBe('rgba(1,2,3,1)');
  });
  it('materialsLabel', () => {
    const a = pool.find((x) => x.materials.length === 0)!;
    expect(materialsLabel(a)).toBe('Rien à préparer');
  });
});
