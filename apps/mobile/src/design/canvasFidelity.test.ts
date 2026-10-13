import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AA_TEXT, contrastRatio } from './contrast';
import { COLORS, STYLE_KEYS, STYLE_METRICS, TYPE, typeSpec, withAlpha, type StyleKey } from './tokens';
import { TAB_LAYOUTS } from './tabConfig';

/**
 * Fidélité au canevas Claude Design : les valeurs de tokens.ts sont comparées à la feuille de style
 * `docs/design/claude-design-ios27/_blob/c8a22b05….css` (blocs `.phone` = Natif, `.phone.dark` = Nuit calme,
 * `[data-v="v3"] .phone` = Carnet) et les chemins d'icônes aux écrans `.dc.html`.
 */
const ROOT = resolve(__dirname, '../../../../docs/design/claude-design-ios27');
const CSS_PATH = resolve(ROOT, '_blob/c8a22b05c04467fb309a06729e7d51ed.css');
const HAS_CANVAS = existsSync(CSS_PATH);
const describeCanvas = HAS_CANVAS ? describe : describe.skip;

function block(css: string, selector: string): string {
  const i = css.indexOf(selector + ' {');
  if (i < 0) throw new Error('bloc CSS introuvable : ' + selector);
  return css.slice(i, css.indexOf('}', i));
}

/** `rgba(60,60,67,.74)` ≡ `rgba(60,60,67,0.74)` ; hex en minuscules. */
function norm(v: string): string {
  const s = v.trim().toLowerCase();
  const m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (!m) return s;
  const parts = m[1].split(',').map((x) => Number(x.trim()));
  if (parts.length === 3) parts.push(1);
  return parts.join(',');
}

const VAR_TO_TOKEN: Record<string, keyof (typeof COLORS)['natif']> = {
  bg: 'bgGrouped', bg2: 'bgGrouped2', bg3: 'bgGrouped3', elev: 'elev',
  label: 'label', label2: 'label2', label3: 'label3', label4: 'label4',
  sep: 'separator', 'sep-opaque': 'sepOpaque',
  fill: 'fill', fill2: 'fill2', fill3: 'fill3', fill4: 'fill4',
  tint: 'tint', 'tint-ink': 'tintInk', 'tint-soft': 'tintSoft', 'tint-text': 'tintText',
  accent: 'accent', 'accent-ink': 'accentInk', kid: 'kid', 'kid-text': 'kidText',
  ok: 'ok', warn: 'warn', bad: 'bad',
  glass: 'glass', 'glass-strong': 'glassStrong', 'glass-edge': 'glassEdge', 'glass-spec': 'glassSpec', 'glass-tint': 'glassTint',
};
const SYS_TO_TOKEN: Record<string, keyof (typeof COLORS)['natif']> = {
  'sys-red': 'sysRed', 'sys-orange': 'sysOrange', 'sys-yellow': 'sysYellow', 'sys-green': 'sysGreen', 'sys-mint': 'sysMint',
  'sys-teal': 'sysTeal', 'sys-cyan': 'sysCyan', 'sys-blue': 'sysBlue', 'sys-indigo': 'sysIndigo', 'sys-purple': 'sysPurple', 'sys-pink': 'sysPink',
};
const BLOCK_OF: Record<StyleKey, string> = {
  natif: '.phone',
  nuit: '.phone.dark, [data-v="v2"] .phone',
  carnet: '[data-v="v3"] .phone',
};

describeCanvas('tokens.ts = feuille de style du canevas', () => {
  const css = HAS_CANVAS ? readFileSync(CSS_PATH, 'utf8') : '';
  const root = HAS_CANVAS ? block(css, ':root') : '';

  describe.each(STYLE_KEYS)('%s', (style) => {
    const body = HAS_CANVAS ? block(css, BLOCK_OF[style]) : '';
    const vars = new Map<string, string>();
    for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars.set(m[1], m[2]);

    it('toutes les variables de couleur du bloc [data-v] sont reportées à l’identique', () => {
      for (const [cssVar, token] of Object.entries(VAR_TO_TOKEN)) {
        const v = vars.get(cssVar);
        expect(v, `--${cssVar} absent du bloc ${style}`).toBeDefined();
        expect(norm((COLORS[style] as Record<string, string>)[token]), `${style}.${token} ≠ --${cssVar}`).toBe(norm(v as string));
      }
    });

    it('couleurs système : valeurs :root, surchargées par le bloc Nuit calme', () => {
      for (const [cssVar, token] of Object.entries(SYS_TO_TOKEN)) {
        const v = vars.get(cssVar) ?? new RegExp(`--${cssVar}:\\s*([^;]+);`).exec(root)?.[1];
        expect(v, `--${cssVar}`).toBeDefined();
        expect(norm((COLORS[style] as Record<string, string>)[token]), `${style}.${token}`).toBe(norm(v as string));
      }
    });

    it('rayons et titres du style (--card-r, --row-r, --display-*)', () => {
      expect(STYLE_METRICS[style].cardRadius).toBe(parseFloat(vars.get('card-r') ?? '26'));
      expect(STYLE_METRICS[style].rowRadius).toBe(parseFloat(vars.get('row-r') ?? '26'));
      expect(STYLE_METRICS[style].displayWeight).toBe(parseFloat(vars.get('display-weight') ?? '700'));
      expect(STYLE_METRICS[style].displayTrack).toBe(parseFloat(vars.get('display-track') ?? '0.2'));
      expect(STYLE_METRICS[style].cardShadow).toBe((vars.get('shadow-card') ?? 'none') !== 'none');
    });
  });

  it('échelle typographique .t-* (taille / interligne / graisse / interlettrage)', () => {
    const t = (name: string) => {
      const m = new RegExp(`\\.${name} \\{ font: (\\d+) (\\d+)px/(\\d+)px[^;]*; letter-spacing: (-?[\\d.]+)px`).exec(css);
      if (!m) throw new Error('.' + name + ' introuvable');
      return { weight: +m[1], size: +m[2], line: +m[3], track: +m[4] };
    };
    const specs: Record<string, string> = {
      title1: 't-title1', title2: 't-title2', title3: 't-title3', headline: 't-headline', body: 't-body',
      callout: 't-callout', sub: 't-sub', foot: 't-foot', cap2: 't-cap2',
    };
    for (const [key, cls] of Object.entries(specs)) {
      const c = t(cls);
      const s = TYPE[key as keyof typeof TYPE];
      expect([s.fontSize, s.lineHeight, s.weight, s.letterSpacing]).toEqual([c.size, c.line, c.weight, c.track]);
    }
    expect([TYPE.cap.fontSize, TYPE.cap.lineHeight, TYPE.cap.weight]).toEqual([12, 16, 400]);
  });

  it('grand titre : 34/41 Inter 700 .2 (Natif, Nuit) ; 36/42 Fraunces 600 −.2 (Carnet)', () => {
    expect(typeSpec('largetitle', 'natif')).toMatchObject({ fontSize: 34, lineHeight: 41, weight: 700, letterSpacing: 0.2 });
    expect(typeSpec('largetitle', 'nuit').family).toBeUndefined();
    expect(typeSpec('largetitle', 'carnet')).toMatchObject({ fontSize: 36, lineHeight: 42, weight: 600, letterSpacing: -0.2, family: 'display' });
    expect(typeSpec('title1', 'carnet')).toMatchObject({ family: 'display', weight: 600, letterSpacing: -0.2 });
    expect(typeSpec('sectionTitle', 'carnet')).toMatchObject({ family: 'display', weight: 600, letterSpacing: -0.26 });
    expect(typeSpec('body', 'carnet').family).toBeUndefined();
  });
});

describe('contraste des ajouts du canevas', () => {
  it.each(STYLE_KEYS)('%s : tintText lisible sur bgGrouped2 ≥ 4,5', (style) => {
    const c = COLORS[style];
    expect(contrastRatio(c.tintText, c.bgGrouped2)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('withAlpha', () => {
  it('convertit hex et rgba', () => {
    expect(withAlpha('#F7F5F2', 0.78)).toBe('rgba(247,245,242,0.78)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('rgba(60,60,67,0.74)', 0.5)).toBe('rgba(60,60,67,0.37)');
  });
});

describe('barres d’onglets relevées sur les écrans K, G, S, U', () => {
  it('Natif : Coach teinté seulement quand actif ; Nuit : « Ce soir » toujours teinté ; Carnet : verre neutre', () => {
    expect(TAB_LAYOUTS.natif.prominent).toMatchObject({ label: 'Coach', glyph: 'chat', tone: 'auto', route: 'messages' });
    expect(TAB_LAYOUTS.nuit.prominent).toMatchObject({ label: 'Ce soir', glyph: 'play', tone: 'tinted' });
    expect(TAB_LAYOUTS.carnet.prominent).toMatchObject({ label: 'Rechercher', glyph: 'search', tone: 'glass' });
  });
  it('icônes des onglets : Maison/Bilan/Séances (étincelles) en Natif et Nuit ; lune/carte d’identité en Carnet', () => {
    expect(TAB_LAYOUTS.natif.tabs.map((t) => t.glyph)).toEqual(['home', 'sparkles', 'calendar']);
    expect(TAB_LAYOUTS.nuit.tabs.map((t) => t.glyph)).toEqual(['home', 'sparkles', 'calendar']);
    expect(TAB_LAYOUTS.carnet.tabs.map((t) => t.glyph)).toEqual(['moon', 'idCard', 'calendar']);
  });
});

describeCanvas('icons.tsx = chemins du canevas', () => {
  it('chaque tracé `d` de icons.tsx figure tel quel dans un écran .dc.html', () => {
    const src = readFileSync(resolve(__dirname, 'icons.tsx'), 'utf8');
    const ds = [...src.matchAll(/d: '([^']+)'/g)].map((m) => m[1]);
    expect(ds.length).toBeGreaterThan(50);
    const dir = resolve(ROOT, 'project');
    const html = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => readFileSync(resolve(dir, f), 'utf8')).join('\n');
    const missing = ds.filter((d) => !html.includes(`d="${d}"`));
    expect(missing).toEqual([]);
  });
});
