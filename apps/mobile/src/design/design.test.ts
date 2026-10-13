import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AA_TEXT, contrastRatio } from './contrast';
import { COLORS, DEFAULT_STYLE, SPACING, STYLE_KEYS, TYPE, getTokens, isStyleKey } from './tokens';
import { BASE_VIGNETTE_ID, VIGNETTE_IDS, resolveVignetteId } from './vignetteIds';
import { HIDDEN_FROM_BAR, TAB_LAYOUTS } from './tabConfig';
import tokensJson from '../../../../docs/design/ios27-design-system/project/tokens.json';

const THEME_OF = { natif: 'light', nuit: 'dark', carnet: 'creme' } as const;

describe('thèmes', () => {
  it('expose les trois styles, natif par défaut', () => {
    expect(STYLE_KEYS).toEqual(['natif', 'nuit', 'carnet']);
    expect(DEFAULT_STYLE).toBe('natif');
    expect(isStyleKey('nuit')).toBe(true);
    expect(isStyleKey('sombre')).toBe(false);
  });

  it.each(STYLE_KEYS)('%s : toutes les couleurs correspondent à tokens.json', (style) => {
    const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
    const theme = THEME_OF[style];
    for (const tok of tokensJson.color.tokens) {
      expect((COLORS[style] as Record<string, string>)[camel(tok.name)]).toBe(
        (tok.value as Record<string, string>)[theme],
      );
    }
  });

  it('valeurs clés par style', () => {
    expect(COLORS.natif.tint).toBe('#004e7a');
    expect(COLORS.nuit.bgGrouped).toBe('#000000');
    expect(COLORS.nuit.tint).toBe('#f9eb50');
    expect(COLORS.carnet.bgGrouped).toBe('#f7f5f2');
    expect(getTokens('nuit').isDark).toBe(true);
    expect(getTokens('carnet').isDark).toBe(false);
  });

  it('styles de texte : 17 pt pour body (pas de zoom iOS), Fraunces pour le display', () => {
    expect(TYPE.body.fontSize).toBe(17);
    expect(TYPE.displayLarge.family).toBe('display');
    expect(TYPE.numeralHero.family).toBe('rounded');
  });
});

describe('contraste AA (WCAG)', () => {
  it('calcule les ratios de référence', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  describe.each(STYLE_KEYS)('%s', (style) => {
    const c = COLORS[style];
    it('label sur bg-grouped et bg-grouped-2 ≥ 4,5', () => {
      expect(contrastRatio(c.label, c.bgGrouped)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.label, c.bgGrouped2)).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it('label-2 (texte secondaire) sur bg-grouped et bg-grouped-2 ≥ 4,5', () => {
      expect(contrastRatio(c.label2, c.bgGrouped)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.label2, c.bgGrouped2)).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it('accent-ink sur accent ≥ 4,5', () => {
      expect(contrastRatio(c.accentInk, c.accent)).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it('tint-ink sur tint ≥ 4,5', () => {
      expect(contrastRatio(c.tintInk, c.tint)).toBeGreaterThanOrEqual(AA_TEXT);
    });
    it('tint lisible en texte/icône sur bg-grouped ≥ 4,5', () => {
      expect(contrastRatio(c.tint, c.bgGrouped)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });
});

describe('cibles tactiles et mesures', () => {
  it('touch-min ≥ 44, row-min ≥ 52, tabbar-h = 62', () => {
    expect(SPACING.touchMin).toBeGreaterThanOrEqual(44);
    expect(SPACING.rowMin).toBeGreaterThanOrEqual(52);
    expect(SPACING.tabbarH).toBe(62);
    expect(SPACING.tabbarH).toBeGreaterThanOrEqual(SPACING.touchMin);
  });
});

describe('VignetteImage — résolution', () => {
  it('52 vignettes dont BON-01, toutes présentes sur disque', () => {
    expect(VIGNETTE_IDS).toHaveLength(52);
    expect(VIGNETTE_IDS).toContain('BON-01');
    for (const id of VIGNETTE_IDS) {
      expect(existsSync(resolve(__dirname, '../../assets/vignettes', `${id}.webp`))).toBe(true);
    }
  });
  it('id connu conservé (insensible à la casse)', () => {
    expect(resolveVignetteId('ACT-0101')).toBe('ACT-0101');
    expect(resolveVignetteId(' act-1303 ')).toBe('ACT-1303');
  });
  it('ACT-0704, inconnu, vide ou nul ⇒ repli ACT-0603', () => {
    expect(BASE_VIGNETTE_ID).toBe('ACT-0603');
    for (const id of ['ACT-0704', 'ACT-9999', '', null, undefined]) {
      expect(resolveVignetteId(id)).toBe('ACT-0603');
    }
  });
});

describe('barre d’onglets du parent', () => {
  it('Natif : Maison · Bilan · Mes séances + Coach (messages)', () => {
    const l = TAB_LAYOUTS.natif;
    expect(l.tabs.map((t) => t.label)).toEqual(['Maison', 'Bilan', 'Mes séances']);
    expect(l.prominent).toMatchObject({ label: 'Coach', route: 'messages' });
  });
  it('Nuit calme : Prominent « Ce soir » vers maison', () => {
    expect(TAB_LAYOUTS.nuit.prominent).toMatchObject({ label: 'Ce soir', route: 'maison' });
  });
  it('Carnet : « Ce soir » en premier onglet, recherche en Prominent', () => {
    const l = TAB_LAYOUTS.carnet;
    expect(l.tabs.map((t) => t.label)).toEqual(['Ce soir', 'Bilan', 'Mes séances']);
    expect(l.prominent.label).toBe('Rechercher');
  });
  it('les routes visibles et masquées couvrent les six routes sans doublon', () => {
    const visible = TAB_LAYOUTS.natif.tabs.map((t) => t.route);
    expect([...visible, ...HIDDEN_FROM_BAR].sort()).toEqual(
      ['bilans', 'dashboard', 'maison', 'messages', 'profile', 'seances'],
    );
  });
});
