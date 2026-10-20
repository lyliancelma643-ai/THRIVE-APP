import { describe, expect, it } from 'vitest';
import { programDisplayInstallments } from './program-packs';
import { programCheckoutMessage, toCheckoutBody } from './program-checkout';

describe('affichage des versements de programmes', () => {
  it('versement 1 TTC conforme à la gamme V3', () => {
    const ttc = (p: 'GROUPE' | 'INDIVIDUEL' | 'COMPLET') => programDisplayInstallments(p, 'deux_versements')[0].ttcCents;
    expect(ttc('GROUPE')).toBe(34493);
    expect(ttc('INDIVIDUEL')).toBe(86231);
    expect(ttc('COMPLET')).toBe(114975);
  });

  it('deux versements = total, une fois = un seul versement', () => {
    const two = programDisplayInstallments('GROUPE', 'deux_versements');
    expect(two.map((i) => i.dueWhen)).toEqual(['inscription', 'seance_7']);
    expect(two[0].htCents + two[1].htCents).toBe(60000);
    expect(programDisplayInstallments('COMPLET', 'une_fois')).toHaveLength(1);
    expect(programDisplayInstallments('COMPLET', 'une_fois')[0].htCents).toBe(200000);
  });
});

describe('corps de create-program-checkout', () => {
  it('ne contient que pack, mode et origin — jamais de montant', () => {
    const body = toCheckoutBody('GROUPE', 'une_fois', 'https://app.example');
    expect(Object.keys(body).sort()).toEqual(['mode', 'origin', 'pack']);
  });
  it('messages neutres', () => {
    expect(programCheckoutMessage('pack_active')).toMatch(/déjà en cours/);
    expect(programCheckoutMessage('inconnu')).toMatch(/Réessaie/);
  });
});
