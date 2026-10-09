// Lancer (vitest de l'app web) : cd apps/web && npx vitest run --root ../mobile src/services
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseParentAccess, sectionView } from './access';

const base = { role: 'PARENT', unlocked: true, is_staff: false };

describe('parseParentAccess', () => {
  it('pack actif : les trois sections', () => {
    const a = parseParentAccess({ ...base, sections: { maison: true, bilan: true, seances: true }, bilan_mode: 'complet', seances_mode: 'complet', source_maison: 'pack' })!;
    expect([a.maison, a.bilan, a.seances]).toEqual([true, true, true]);
    expect(sectionView(a, 'bilan')).toBe('open');
  });
  it('Maison seul : Bilan et Séances verrouillés', () => {
    const a = parseParentAccess({ ...base, sections: { maison: true, bilan: false, seances: false }, bilan_mode: 'verrouille', seances_mode: 'verrouille', source_maison: 'abonnement' })!;
    expect(a.maison).toBe(true);
    expect(sectionView(a, 'bilan')).toBe('locked');
    expect(sectionView(a, 'seances')).toBe('locked');
  });
  it('pack terminé : lecture seule', () => {
    const a = parseParentAccess({ ...base, sections: { maison: false, bilan: true, seances: true }, bilan_mode: 'lecture', seances_mode: 'lecture', pack_fin: '2026-09-30' })!;
    expect(sectionView(a, 'seances')).toBe('readonly');
    expect(a.packEnd).toBe('2026-09-30');
  });
  it('clé absente = fermé, réponse anonyme = null', () => {
    expect(parseParentAccess({ role: 'PARENT', unlocked: true })!.bilan).toBe(false);
    expect(parseParentAccess({ unlocked: false, reason: 'anonymous' })).toBeNull();
  });
});

// Scénario 14 : aucun lien vers un paiement web sur les écrans verrouillés.
describe('anti-steering (écrans verrouillés mobile)', () => {
  const files = [
    '../components/access/LockedSection.tsx',
    '../app/(parent)/bilans.tsx',
    '../app/(parent)/seances.tsx',
    './access.ts',
  ].map((f) => readFileSync(join(__dirname, f), 'utf8'));
  it('aucune mention de checkout, Stripe, prix ou site des packs', () => {
    for (const src of files) {
      expect(src).not.toMatch(/checkout|stripe|PACKS_URL|thrivesportpositive\.com\/(packs|tarifs|prix)|\$\s?\d|\d+(?:[.,]\d+)?\s?\$(?!\{)/i);
    }
  });
  it('les URL externes ne viennent que de la configuration (vidéo, rendez-vous)', () => {
    const locked = files[0];
    expect(locked).not.toMatch(/https?:\/\//);
  });
});
