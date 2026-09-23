import { describe, expect, it } from 'vitest';
import {
  ageFromBirthDate,
  buildRewardPayload,
  captureText,
  fill,
  mergeMoments,
  parseDuration,
  parsePlace,
  type P3MomentRow,
} from './app';
import { CLOSING_SCREEN, OVERTIME_LINE } from './guide';
import { bandForAge } from './index';

const row = (id: string, iso: string, extra: Partial<P3MomentRow> = {}): P3MomentRow => ({
  activity_id: id,
  created_at: new Date(iso).toISOString(),
  duration_chosen: 10,
  rating: null,
  week: Number(id.slice(4, 6)),
  kept_phrase: null,
  capture: null,
  ...extra,
});

describe('couche applicative P3', () => {
  it('âge révolu et tranche : 6 ans → hors programme, 9 → 8-11, 16 → 15-17', () => {
    const now = new Date('2026-09-22T12:00:00');
    expect(ageFromBirthDate('2020-01-01', now)).toBe(6);
    expect(bandForAge(ageFromBirthDate('2020-01-01', now)!)).toBeNull();
    expect(ageFromBirthDate('2017-09-23', now)).toBe(8); // anniversaire demain
    expect(bandForAge(ageFromBirthDate('2017-05-01', now)!)).toBe('8-11');
    expect(bandForAge(ageFromBirthDate('2010-01-01', now)!)).toBe('15-17');
    expect(ageFromBirthDate(null, now)).toBeNull();
  });

  it('paramètres d’URL : durée et lieu toujours valides', () => {
    expect(parseDuration('20')).toBe(20);
    expect(parseDuration('45')).toBe(10);
    expect(parsePlace('voiture')).toBe('voiture');
    expect(parsePlace(null)).toBe('maison');
  });

  it('gabarits : écran de clôture et dépassement positif', () => {
    expect(fill(CLOSING_SCREEN, { minutes: 12, prenom: 'Léa' })).toBe('12 minutes avec Léa.');
    expect(fill(OVERTIME_LINE, { extra: 3 })).toBe('3 minutes de plus — tant mieux.');
  });

  it('fusion base + local sans doublon, du plus récent au plus ancien', () => {
    const a = row('ACT-0101', '2026-10-01T19:00:00');
    const b = row('ACT-0102', '2026-10-02T19:00:00');
    const merged = mergeMoments([a], [a, b]);
    expect(merged.map((m) => m.activity_id)).toEqual(['ACT-0102', 'ACT-0101']);
  });

  it('Fiche Identité remplie avec les captures de la semaine 1', () => {
    const moments = [
      row('ACT-0101', '2026-10-01T19:00:00', { capture: { kind: 'forces', items: ['Il range', 'Il aide', ''] } }),
      row('ACT-0102', '2026-10-02T19:00:00', { capture: { kind: 'choix', text: 'Le soccer' } }),
      row('ACT-0103', '2026-10-03T19:00:00', { kept_phrase: 'Nager sans peur' }),
    ];
    expect(buildRewardPayload('fiche_identite', moments)).toEqual({
      forces: ['Il range', 'Il aide'],
      choix: ['Le soccer'],
      reve: ['Nager sans peur'],
    });
  });

  it('la récompense « lettre » ne contient jamais le corps de la lettre', () => {
    const p = buildRewardPayload('lettre_un_an', [], { sealedAt: '2026-12-01T00:00:00.000Z' });
    expect(p).toEqual({ sealed_at: '2026-12-01T00:00:00.000Z' });
  });

  it('Boîte à outils : outils, mots et personnes des semaines 2 à 11', () => {
    const moments = [
      row('ACT-0501', '2026-11-01T19:00:00', { capture: { kind: 'outil', text: 'Le ballon' } }),
      row('ACT-0901', '2026-12-01T19:00:00', { capture: { kind: 'mot', text: 'Glisse' } }),
      row('ACT-0101', '2026-10-01T19:00:00', { capture: { kind: 'forces', items: ['x'] } }),
    ];
    expect(buildRewardPayload('boite_a_outils', moments)).toEqual({
      outils: [
        { kind: 'outil', text: 'Le ballon' },
        { kind: 'mot', text: 'Glisse' },
      ],
    });
    expect(captureText({ kind: 'forces', items: ['a', 'b'] })).toBe('a · b');
  });
});
