import { describe, expect, it } from 'vitest';
import { MICROCOPY, MICROCOPY_MAX, pickMicrocopy } from './microcopy';

describe('microcopy', () => {
  it('120 caractères maximum, même avec un long prénom', () => {
    for (const m of MICROCOPY) {
      const t = m.text.replace('{prenom}', 'Marie-Alexandrine').replace('{activités}', 'activités').replace('{n}', '12').replace('{w}', '4').replace('{phrases}', 'phrases').replace('{date}', '25 janvier');
      expect(t.length, m.id).toBeLessThanOrEqual(MICROCOPY_MAX);
    }
  });
  it('jamais deux fois le même d’affilée', () => {
    let last: string | null = null;
    for (let i = 0; i < 8; i++) {
      const p = pickMicrocopy({ context: 'ouverture', week: 2, childName: 'Léa', lastShownId: last, showUnreviewed: true });
      expect(p).not.toBeNull();
      expect(p!.id).not.toBe(last);
      last = p!.id;
    }
  });
  it('un rappel sans donnée est ignoré', () => {
    const p = pickMicrocopy({ context: 'upload', childName: 'Léa', family: 'reminder' });
    expect(p).toBeNull();
    const q = pickMicrocopy({ context: 'upload', childName: 'Léa', family: 'reminder', data: { phrasesKept: 7 } });
    expect(q?.resolved).toBe('Léa a gardé 7 phrases depuis le début.');
  });
  it('rappel avant définition avant mot doux', () => {
    expect(pickMicrocopy({ context: 'ouverture', week: 2, childName: 'Léa', data: { letterDate: '25 janvier' }, showUnreviewed: true })?.family).toBe('reminder');
    expect(pickMicrocopy({ context: 'ouverture', week: 2, showUnreviewed: true })?.id).toBe('def-smart');
    expect(pickMicrocopy({ context: 'ouverture', week: 2, showUnreviewed: false })?.family).toBe('parent');
  });
  it('les définitions non relues sont masquées en production', () => {
    for (let i = 0; i < 10; i++) {
      const p = pickMicrocopy({ context: 'paiement', week: 3, showUnreviewed: false });
      expect(p?.reviewed).toBe(true);
    }
  });
  it('sans prénom, les textes qui en ont besoin sont écartés', () => {
    const p = pickMicrocopy({ context: 'post-activite', showUnreviewed: false });
    expect(p?.resolved).not.toContain('{prenom}');
  });
});
