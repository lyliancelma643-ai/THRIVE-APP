// Lancer : cd apps/web && npx vitest run --root ../mobile src/components/offres
import { describe, expect, it } from 'vitest';
import { PROGRAMS, formatCentsFr, formatCentsShortFr, programByPack, todayCents, withTaxesCents } from './pricing';

describe('programmes — affichage TTC (×1,14975)', () => {
  it('1er versement TTC : Groupe 344,93 $, Individuel 862,31 $, Complet 1 149,75 $', () => {
    const t = (pack: string) => formatCentsFr(withTaxesCents(todayCents(programByPack(pack)!, 'deux_versements')));
    expect(t('groupe')).toBe('344,93 $');
    expect(t('individuel')).toBe('862,31 $');
    expect(t('complet')).toBe('1 149,75 $');
  });
  it('prix HT de la gamme V3 et deux versements égaux', () => {
    expect(PROGRAMS.map((p) => p.totalCents)).toEqual([60000, 150000, 200000]);
    expect(todayCents(PROGRAMS[0], 'une_fois')).toBe(60000);
    expect(formatCentsShortFr(60000)).toBe('600 $');
  });
  it('pack inconnu', () => {
    expect(programByPack('x')).toBeNull();
  });
});
