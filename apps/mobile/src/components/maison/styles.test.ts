import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { showOffersInvite } from './models';

describe('invitation Offres (K3 · Maison seul)', () => {
  it('Veillée seulement, jamais pour un abonné accompagné', () => {
    expect(showOffersInvite({ styleKey: 'veillee', sourceMaison: 'abonnement' })).toBe(true);
    expect(showOffersInvite({ styleKey: 'veillee', sourceMaison: null })).toBe(true);
    expect(showOffersInvite({ styleKey: 'veillee', sourceMaison: 'pack' })).toBe(false);
    expect(showOffersInvite({ styleKey: 'lin', sourceMaison: 'abonnement' })).toBe(false);
  });
});

// Écrans Maison migrés (GO 4) : plus aucune trace des anciens styles ni de l'ancienne API de style.
const FILES = [
  '../../app/(parent)/maison.tsx', '../../app/(parent)/parcours.tsx', '../../app/(parent)/carnet.tsx',
  'HomeView.tsx', 'HomeParts.tsx', 'TonightHero.tsx', 'FicheView.tsx', 'ParcoursView.tsx', 'CarnetView.tsx', 'palette.ts',
  'viewModels.ts', 'models.ts', '../../dev-gallery/lot-maison.tsx', '../../dev-gallery/fixtures/maison.ts',
];

describe('migration Lin / Veillée', () => {
  it.each(FILES)('%s : ni natif, ni nuit, ni Carnet de saison, ni ancienne API', (f) => {
    const src = readFileSync(resolve(__dirname, f), 'utf8');
    expect(src).not.toMatch(/natif|nuit|Nuit calme|Carnet de saison/i);
    expect(src).not.toMatch(/useTheme\(\)\.style\b|\{[^}]*\bstyle\b[^}]*\} = useTheme\(\)|HOME_PALETTES|useHomePalette/);
  });

  it('aucune donnée de démo en dur dans les vues', () => {
    for (const f of ['HomeView.tsx', 'TonightHero.tsx', 'FicheView.tsx', 'CarnetView.tsx', 'ParcoursView.tsx']) {
      expect(readFileSync(resolve(__dirname, f), 'utf8')).not.toMatch(/Léo|La cabane impossible|Camille/);
    }
  });
});
