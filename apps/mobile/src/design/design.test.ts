import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { AA_LARGE, AA_TEXT, contrastPairs, contrastRatio } from './contrast';
import { COLORS, DEFAULT_STYLE, SPACING, STYLE_DESCRIPTIONS, STYLE_KEYS, STYLE_LABELS, TYPE, getTokens, isStyleKey } from './tokens';
import { BASE_VIGNETTE_ID, VIGNETTE_IDS, resolveVignetteId } from './vignetteIds';
import { HIDDEN_FROM_BAR, TAB_LAYOUTS, activeTabKey, tabLayoutFor } from './tabConfig';
import { scopeTheme, themeFor, type ThemeContextValue } from './themeValue';
import { TEXTURE_FILES, TEXTURE_MAX_BYTES, archGeometry, archPath, enamelSpec, feltSpec, paperSpec, starSpec, velvetSpec } from './materialSpecs';
import { STYLE_LABELS as LEGACY_LABELS, STYLE_KEYS as LEGACY_KEYS, COLORS as LEGACY_COLORS, TAB_LAYOUTS as LEGACY_TABS } from './legacyCompat';

describe('thèmes', () => {
  it('expose deux styles, Lin par défaut', () => {
    expect(STYLE_KEYS).toEqual(['lin', 'veillee']);
    expect(DEFAULT_STYLE).toBe('lin');
    expect(STYLE_LABELS).toEqual({ lin: 'Lin', veillee: 'Veillée' });
    expect(STYLE_DESCRIPTIONS).toEqual({ lin: 'Clair, papier et lin', veillee: 'Sombre, à la lampe' });
    expect(isStyleKey('veillee')).toBe(true);
    expect(isStyleKey('sombre')).toBe(false);
  });

  it('rendu des deux thèmes : fond, texte, accent, sombre ou clair', () => {
    const lin = getTokens('lin');
    const veillee = getTokens('veillee');
    expect(lin.isDark).toBe(false);
    expect(veillee.isDark).toBe(true);
    expect([lin.colors.bgGrouped, lin.colors.label, lin.colors.tint]).toEqual(['#F7F5F2', '#022539', '#004E7A']);
    expect([veillee.colors.bgGrouped, veillee.colors.label, veillee.colors.tint]).toEqual(['#022539', '#F7F5F2', '#F9EB50']);
    expect(lin.colors.accent).toBe('#F9EB50');
    expect(veillee.colors.accent).toBe('#F9EB50');
    expect(lin.metrics.lamp.alpha).toBeGreaterThan(veillee.metrics.lamp.alpha);
  });

  it('styles de texte : 17 pt pour body (pas de zoom iOS), Fraunces pour le display', () => {
    expect(TYPE.body.fontSize).toBe(17);
    expect(TYPE.displayLarge.family).toBe('display');
    expect(TYPE.numeralHero.family).toBe('display');
  });

  it('ThemeScope : un sous-arbre forcé en Veillée prend tous les tokens Veillée et garde setStyle / accessibilité', () => {
    const setStyle = () => {};
    const parent: ThemeContextValue = { ...themeFor('lin'), setStyle, reduceTransparency: true, reduceMotion: true, fontsLoaded: true };
    const scoped = scopeTheme(parent, 'veillee');
    expect(scoped.styleKey).toBe('veillee');
    expect(scoped.isDark).toBe(true);
    expect(scoped.colors.bgGrouped).toBe('#022539');
    expect(scoped.colors.label).toBe('#F7F5F2');
    expect(scoped.setStyle).toBe(setStyle);
    expect([scoped.reduceTransparency, scoped.reduceMotion, scoped.fontsLoaded]).toEqual([true, true, true]);
    // Le parent n'est pas modifié.
    expect(parent.styleKey).toBe('lin');
    expect(parent.colors.bgGrouped).toBe('#F7F5F2');
  });
});

describe('contraste AA (WCAG) de toutes les paires', () => {
  it('calcule les ratios de référence', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  describe.each(STYLE_KEYS)('%s', (style) => {
    const pairs = contrastPairs(style);
    it('couvre surfaces, papier, feutre, velours, émail, onglets et pastilles', () => {
      expect(pairs.length).toBeGreaterThanOrEqual(40);
      const names = pairs.map((p) => p.name).join('\n');
      for (const needle of ['encre / papier', 'velours', 'émail', 'barre d’onglets', 'feutre']) expect(names).toContain(needle);
    });
    it.each(pairs.map((p) => [p.name, p] as const))('%s', (_n, p) => {
      expect(p.min === AA_TEXT || p.min === AA_LARGE).toBe(true);
      expect(contrastRatio(p.fg, p.bg), `${p.fg} sur ${p.bg}`).toBeGreaterThanOrEqual(p.min);
    });
  });

  it('texte sur Paper en Veillée : l’encre reste marine et lisible sur le papier clair', () => {
    const c = COLORS.veillee;
    expect(paperSpec('veillee').ink).toBe('#022539');
    expect(paperSpec('lin').ink).toBe('#022539');
    expect(contrastRatio(paperSpec('veillee').ink, c.paper)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(paperSpec('veillee').sage, c.paper)).toBeGreaterThanOrEqual(AA_TEXT);
    // Piège évité : le texte crème de Veillée n'est PAS lisible sur le papier crème.
    expect(contrastRatio(c.label, c.paper)).toBeLessThan(AA_LARGE);
  });
});

describe('cibles tactiles et mesures', () => {
  it('touch-min ≥ 44, row-min ≥ 52, tabbar-h = 62', () => {
    expect(SPACING.touchMin).toBeGreaterThanOrEqual(44);
    expect(SPACING.rowMin).toBeGreaterThanOrEqual(52);
    expect(SPACING.tabbarH).toBe(62);
    expect(SPACING.tabbarH).toBeGreaterThanOrEqual(SPACING.touchMin);
  });
  it('les boutons du design system respectent 44 pt (md) et 52 pt (lg)', () => {
    const src = readFileSync(resolve(__dirname, 'Button.tsx'), 'utf8');
    expect(src).toMatch(/lg: \{ height: 52/);
    expect(src).toMatch(/md: \{ height: 44/);
  });
});

describe('matières : spécifications', () => {
  it('papier : fond propre au style, vergé ajoute une texture, cadre sur demande', () => {
    expect(paperSpec('lin').background).toBe('#FFFEFB');
    expect(paperSpec('veillee').background).toBe('#F7F5F2');
    expect(paperSpec('lin').textures).toEqual(['paper']);
    expect(paperSpec('veillee', { laid: true, framed: true })).toMatchObject({ textures: ['paper', 'laid'], frame: true });
  });
  it('feutre : marine, plus clair et cerclé en Veillée seulement pour le Prominent', () => {
    expect(feltSpec('lin').background).toBe('#004E7A');
    expect(feltSpec('lin', { strong: true }).texture).toBe('feltStrong');
    expect(feltSpec('lin', { raised: true }).edge).toBeNull();
    expect(feltSpec('veillee', { raised: true })).toMatchObject({ background: '#0B3C59' });
    expect(feltSpec('veillee', { raised: true }).edge).not.toBeNull();
    expect(feltSpec('veillee').background).toBe('#004E7A');
  });
  it('velours, émail et étoile', () => {
    expect(velvetSpec().background).toBe('#00314C');
    expect(enamelSpec().background).toBe('#F9EB50');
    expect(starSpec('lin', true).fill).toBe('#F9EB50');
    expect(starSpec('veillee', true).glow).toBe(COLORS.veillee.starGlow);
    expect(starSpec('lin', false).stops).toBeNull();
  });
  it('arche : coins hauts elliptiques (50 % × 44,8 %), fenêtre rétrécie du passe-partout', () => {
    const g = archGeometry(220, 275, 'md');
    expect(g.inner).toMatchObject({ x: 10, y: 10, width: 200, height: 255 });
    expect(g.outer.ry).toBeCloseTo(275 * 0.448, 5);
    expect(archGeometry(100, 120, 'sm').padding).toBe(7);
    expect(archGeometry(100, 120, 'xs').padding).toBe(5);
    expect(archPath(0, 0, 100, 120, 50, 20)).toMatch(/^M 0 \d+(\.\d+)? A 50 /);
  });
});

describe('textures exportées (assets/brand/textures)', () => {
  const dir = resolve(__dirname, '../../assets/brand/textures');
  it('une tuile PNG par matière, chacune ≤ 20 Ko', () => {
    for (const file of Object.values(TEXTURE_FILES)) {
      const path = resolve(dir, file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeLessThanOrEqual(TEXTURE_MAX_BYTES);
    }
  });
  it('textures.ts référence chaque fichier, et rien d’autre n’est embarqué', () => {
    const src = readFileSync(resolve(__dirname, 'textures.ts'), 'utf8');
    for (const file of Object.values(TEXTURE_FILES)) expect(src).toContain(`/textures/${file}`);
    expect(readdirSync(dir).sort()).toEqual(Object.values(TEXTURE_FILES).sort());
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
  it('Lin : Maison · Bilan · Mes séances + Coach (messages)', () => {
    const l = TAB_LAYOUTS.lin;
    expect(l.tabs.map((t) => t.label)).toEqual(['Maison', 'Bilan', 'Mes séances']);
    expect(l.prominent).toMatchObject({ label: 'Coach', route: 'messages' });
  });
  it('Veillée : mêmes trois onglets + Prominent « Ce soir » vers maison', () => {
    const l = TAB_LAYOUTS.veillee;
    expect(l.tabs.map((t) => t.label)).toEqual(['Maison', 'Bilan', 'Mes séances']);
    expect(l.prominent).toMatchObject({ label: 'Ce soir', route: 'maison' });
  });
  it('les routes visibles et masquées couvrent les six routes sans doublon', () => {
    const visible = TAB_LAYOUTS.lin.tabs.map((t) => t.route);
    expect([...visible, ...HIDDEN_FROM_BAR].sort()).toEqual(['bilans', 'dashboard', 'maison', 'messages', 'profile', 'seances']);
  });
  it('onglet actif : la route du Prominent seule (Coach) n’allume aucun onglet ; Ce soir laisse Maison actif', () => {
    expect(activeTabKey(TAB_LAYOUTS.lin, 'messages')).toBe('');
    expect(activeTabKey(TAB_LAYOUTS.lin, 'bilans')).toBe('bilans');
    expect(activeTabKey(TAB_LAYOUTS.veillee, 'maison')).toBe('maison');
    expect(activeTabKey(TAB_LAYOUTS.lin, undefined)).toBe('');
  });
  it('tabLayoutFor accepte aussi une ancienne valeur de style', () => {
    expect(tabLayoutFor('lin')).toBe(TAB_LAYOUTS.lin);
    expect(tabLayoutFor('nuit')).toBe(TAB_LAYOUTS.veillee);
    expect(tabLayoutFor('carnet')).toBe(TAB_LAYOUTS.lin);
    expect(tabLayoutFor(null)).toBe(TAB_LAYOUTS[DEFAULT_STYLE]);
  });
});

describe('couche de compatibilité temporaire (legacyCompat.ts, à supprimer)', () => {
  it('Lin ⇒ natif, Veillée ⇒ nuit pour les écrans non migrés ; les trois anciennes clés sont indexables', () => {
    expect(themeFor('lin').style).toBe('natif');
    expect(themeFor('veillee').style).toBe('nuit');
    for (const k of LEGACY_KEYS) {
      expect(LEGACY_COLORS[k]).toBeDefined();
      expect(LEGACY_TABS[k]).toBeDefined();
      expect(LEGACY_LABELS[k]).toBeDefined();
    }
    expect(LEGACY_COLORS.natif).toBe(COLORS.lin);
    expect(LEGACY_COLORS.carnet).toBe(COLORS.lin);
    expect(LEGACY_COLORS.nuit).toBe(COLORS.veillee);
  });
});
