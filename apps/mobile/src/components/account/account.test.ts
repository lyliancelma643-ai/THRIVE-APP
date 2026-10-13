import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLORS } from '../../design/tokens';
import { kidAvatarColors } from './kidAvatar';
import { STYLE_PICKER_HINT, STYLE_PICKER_TITLE, styleOptions } from './stylePickerModel';

describe('sélecteur « Style de l’app »', () => {
  it('propose deux tuiles : Lin puis Veillée, avec leur description', () => {
    const o = styleOptions('lin');
    expect(o.map((x) => x.key)).toEqual(['lin', 'veillee']);
    expect(o.map((x) => x.label)).toEqual(['Lin', 'Veillée']);
    expect(o.map((x) => x.description)).toEqual(['Clair, papier et lin', 'Sombre, à la lampe']);
  });

  it('marque la valeur active, une seule à la fois', () => {
    expect(styleOptions('lin').map((x) => x.selected)).toEqual([true, false]);
    expect(styleOptions('veillee').map((x) => x.selected)).toEqual([false, true]);
  });

  it('libellé VoiceOver et textes imposés', () => {
    expect(styleOptions('lin')[1].accessibilityLabel).toBe('Style Veillée, sombre, à la lampe');
    expect(STYLE_PICKER_TITLE).toBe('Style de l’app');
    expect(STYLE_PICKER_HINT).toBe('Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.');
  });
});

describe('couleurs d’avatar des enfants', () => {
  it('1er enfant = couleur kid du style, 2e = sauge, encre lisible', () => {
    const lin = kidAvatarColors(0, COLORS.lin, 'lin');
    expect(lin.background).toBe(COLORS.lin.kid);
    expect(kidAvatarColors(1, COLORS.lin, 'lin').background).toBe(COLORS.lin.sageInk);
    const veillee = kidAvatarColors(0, COLORS.veillee, 'veillee');
    expect(veillee.background).toBe(COLORS.veillee.kid);
    expect(veillee.ink).toBe(COLORS.veillee.tintInk);
    expect(kidAvatarColors(1, COLORS.veillee, 'veillee').background).toBe(COLORS.veillee.sage);
  });

  it('boucle sur la palette au-delà de cinq enfants', () => {
    expect(kidAvatarColors(5, COLORS.lin, 'lin')).toEqual(kidAvatarColors(0, COLORS.lin, 'lin'));
  });
});

describe('migration GO 4 : plus aucune ancienne clé de style dans l’arrivée et le compte', () => {
  const dir = resolve(__dirname);
  const files = readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'));
  it.each(files)('%s', (f) => {
    const src = readFileSync(resolve(dir, f), 'utf8');
    expect(src).not.toMatch(/Nuit calme|Carnet de saison/);
    expect(src).not.toMatch(/'(natif|nuit|carnet)'/);
    expect(src).not.toMatch(/\bstyle\s*===|const \{[^}]*\bstyle\b[^}]*\} = use(Theme|StyleChoice)\(\)/);
  });
});
