import { describe, expect, it } from 'vitest';
import { tourSteps, tourStorageKey } from './steps';

describe('visite guidée de Maison', () => {
  const steps = tourSteps({ childName: 'Léo', weekTarget: 3 });

  it('reste courte : 5 à 10 écrans, clés uniques', () => {
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.length).toBeLessThanOrEqual(10);
    expect(new Set(steps.map((s) => s.key)).size).toBe(steps.length);
  });

  it('couvre le programme, le carnet, lancer et finir, dans cet ordre', () => {
    const order = ['programme', 'carnet', 'lancer', 'finir'].map((k) => steps.findIndex((s) => s.key === k));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('le nombre de repères annoncé correspond aux étapes numérotées', () => {
    const numbered = steps.filter((s) => /^\d+ · /.test(s.eyebrow)).length;
    expect(steps[0].body).toContain(`${numbered} repères`);
  });

  it('personnalise avec le prénom et l’objectif de la semaine ; prénom absent → « votre enfant »', () => {
    expect(steps[0].body).toContain('Léo');
    expect(steps.find((s) => s.key === 'programme')!.title).toBe('3 activités par semaine');
    expect(tourSteps({ childName: ' ', weekTarget: 3 })[0].body).toContain('votre enfant');
  });

  it('clé de stockage par compte', () => {
    expect(tourStorageKey('u1')).not.toBe(tourStorageKey('u2'));
  });
});
