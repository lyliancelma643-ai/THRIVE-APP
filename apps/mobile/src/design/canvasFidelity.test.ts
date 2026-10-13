import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLORS, MATERIALS, STYLE_KEYS, STYLE_METRICS, TYPE, withAlpha, type StyleKey } from './tokens';
import { TAB_LAYOUTS } from './tabConfig';

/**
 * Fidélité aux maquettes finales : les valeurs de tokens.ts sont comparées à `maquettes-ios27/final.css`
 * (blocs `[data-v="v4"] .phone` = Lin, `[data-v="v5"] .phone` = Veillée, socle commun et « Matières »).
 * Les couleurs système et l'échelle Inter viennent de `ios27.css` (chargé avant final.css par les maquettes).
 */
const DIR = resolve(__dirname, '../../../../maquettes-ios27');
const FINAL = readFileSync(resolve(DIR, 'final.css'), 'utf8');
const BASE = readFileSync(resolve(DIR, 'ios27.css'), 'utf8');

/** Fusionne, dans l'ordre du fichier, toutes les déclarations `--x: v;` des règles dont un sélecteur vaut `selector`. */
function vars(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim());
    if (!sels.includes(selector)) continue;
    for (const d of m[2].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out.set(d[1], d[2].trim());
  }
  return out;
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

const SELECTOR: Record<StyleKey, string> = { lin: '[data-v="v4"] .phone', veillee: '[data-v="v5"] .phone' };

const VAR_TO_TOKEN: Record<string, keyof (typeof COLORS)['lin']> = {
  bg: 'bgGrouped', bg2: 'bgGrouped2', bg3: 'bgGrouped3', elev: 'elev', tab: 'tab',
  label: 'label', label2: 'label2', label3: 'label3', label4: 'label4',
  sep: 'separator', 'sep-opaque': 'sepOpaque',
  fill: 'fill', fill2: 'fill2', fill3: 'fill3', fill4: 'fill4',
  tint: 'tint', 'tint-ink': 'tintInk', 'tint-soft': 'tintSoft', 'tint-text': 'tintText',
  accent: 'accent', 'accent-ink': 'accentInk', sage: 'sage', 'sage-ink': 'sageInk', linen: 'linen',
  kid: 'kid', 'kid-text': 'kidText', ok: 'ok', warn: 'warn', bad: 'bad', 'sys-red': 'sysRed', 'sys-green': 'sysGreen',
  glass: 'glass', 'glass-strong': 'glassStrong', 'glass-edge': 'glassEdge', 'glass-spec': 'glassSpec', 'glass-tint': 'glassTint',
  'nav-active': 'navActive', 'badge-bg': 'badgeBg', 'badge-ink': 'badgeInk', 'tgl-on': 'tglOn', 'star-glow': 'starGlow',
  'bub-in': 'bubIn', 'bub-out': 'bubOut',
  paper: 'paper', 'paper-ink': 'paperInk', 'paper-ink2': 'paperInk2', 'paper-sage': 'paperSage',
};
const SYS_TO_TOKEN: Record<string, keyof (typeof COLORS)['lin']> = {
  'sys-orange': 'sysOrange', 'sys-yellow': 'sysYellow', 'sys-mint': 'sysMint', 'sys-teal': 'sysTeal',
  'sys-cyan': 'sysCyan', 'sys-blue': 'sysBlue', 'sys-indigo': 'sysIndigo', 'sys-purple': 'sysPurple', 'sys-pink': 'sysPink',
};

describe('tokens.ts = final.css', () => {
  describe.each(STYLE_KEYS)('%s', (style) => {
    // Socle commun (`[data-v="v4"] .phone, [data-v="v5"] .phone`) puis bloc propre au style : ordre de la cascade.
    const v = vars(FINAL, SELECTOR[style]);

    it('toutes les variables de couleur du bloc sont reportées à l’identique', () => {
      for (const [cssVar, token] of Object.entries(VAR_TO_TOKEN)) {
        const raw = v.get(cssVar);
        expect(raw, `--${cssVar} absent du bloc ${style}`).toBeDefined();
        expect(norm((COLORS[style] as Record<string, string>)[token]), `${style}.${token} ≠ --${cssVar}`).toBe(norm(raw as string));
      }
    });

    it('tabOn = color-mix(nav-active 11 %) et okSoft = badge-bg', () => {
      const nav = (COLORS[style].navActive).replace('#', '');
      const n = parseInt(nav, 16);
      expect(norm(COLORS[style].tabOn)).toBe(norm(`rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},.11)`));
      expect(norm(COLORS[style].okSoft)).toBe(norm(v.get('badge-bg') as string));
    });

    it('couleurs système : base iOS 27 (clair : :root ; sombre : .phone.dark), sauf sys-red / sys-green de final.css', () => {
      const base = style === 'lin' ? vars(BASE, ':root') : vars(BASE, '.phone.dark');
      for (const [cssVar, token] of Object.entries(SYS_TO_TOKEN)) {
        const raw = base.get(cssVar) ?? vars(BASE, ':root').get(cssVar);
        expect(raw, `--${cssVar}`).toBeDefined();
        expect(norm((COLORS[style] as Record<string, string>)[token]), `${style}.${token}`).toBe(norm(raw as string));
      }
    });

    it('rayons, titres (--card-r, --row-r, --display-*) et halo de lampe', () => {
      expect(STYLE_METRICS[style].cardRadius).toBe(parseFloat(v.get('card-r') ?? ''));
      expect(STYLE_METRICS[style].rowRadius).toBe(parseFloat(v.get('row-r') ?? ''));
      expect(STYLE_METRICS[style].displayWeight).toBe(parseFloat(v.get('display-weight') ?? ''));
      expect(STYLE_METRICS[style].displayTrack).toBe(parseFloat(v.get('display-track') ?? ''));
      const lamp = /radial-gradient\((\d+)% (\d+)% at 50% (-?\d+)%, rgba\(249,235,80,([\d.]+)\), rgba\(249,235,80,0\) (\d+)%\)/.exec(v.get('lamp') ?? '');
      expect(lamp, '--lamp').not.toBeNull();
      const l = STYLE_METRICS[style].lamp;
      expect([l.radiusX * 100, l.radiusY * 100, l.centerY * 100, l.alpha, l.fade * 100].map((x) => Math.round(x * 100) / 100)).toEqual([+lamp![1], +lamp![2], +lamp![3], +lamp![4], +lamp![5]]);
    });
  });

  it('les deux styles seulement', () => {
    expect(STYLE_KEYS).toEqual(['lin', 'veillee']);
    expect(Object.keys(COLORS)).toEqual(['lin', 'veillee']);
    expect(Object.keys(STYLE_METRICS)).toEqual(['lin', 'veillee']);
  });
});

describe('matières = blocs « Matières » de final.css', () => {
  const rule = (sel: string) => {
    const m = new RegExp(`${sel.replace(/[.[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(FINAL);
    if (!m) throw new Error('règle introuvable : ' + sel);
    return m[1];
  };

  it('papier : encre marine, filets et sauge', () => {
    const body = rule('.paper');
    expect(body).toContain(`--label: ${MATERIALS.paper.ink}`);
    expect(body).toContain(`--label2: ${MATERIALS.paper.ink2}`);
    expect(norm(/--sep: ([^;]+);/.exec(body)![1])).toBe(norm(MATERIALS.paper.sep));
    expect(body).toContain(`--sage-ink: ${MATERIALS.paper.sage}`);
    expect(body).toContain(`--tint-text: ${MATERIALS.paper.tintText}`);
    expect(norm(/\.frame \{ border: 1px solid ([^;]+);/.exec(FINAL)![1])).toBe(norm(MATERIALS.paper.frame));
    expect(norm(/outline: 1px solid ([^;]+);/.exec(FINAL)![1])).toBe(norm(MATERIALS.paper.frameInner));
  });

  it('feutre, velours, émail, étoile, arche', () => {
    expect(rule('.felt-strong')).toContain(`background-color: ${MATERIALS.felt.color}`);
    const velvet = rule('.velvet');
    expect(velvet).toContain(`background-color: ${MATERIALS.velvet.color}`);
    expect(norm(/--label2: ([^;]+);/.exec(velvet)![1])).toBe(norm(MATERIALS.velvet.ink2));
    expect(norm(/--label3: ([^;]+);/.exec(velvet)![1])).toBe(norm(MATERIALS.velvet.ink3));
    expect(rule('.enamel')).toContain(`background-color: ${MATERIALS.enamel.color}`);
    expect(vars(FINAL, '[data-v="v4"] .phone').get('enamel')).toBe(`radial-gradient(120% 90% at 30% 10%, ${MATERIALS.enamel.highlight} 0%, ${MATERIALS.enamel.mid} 45%, ${MATERIALS.enamel.low} 100%)`);
    expect(rule('.star-on')).toContain(`radial-gradient(circle at 34% 26%, ${MATERIALS.star.onHigh}, ${MATERIALS.star.onMid} 50%, ${MATERIALS.star.onLow})`);
    const arch = rule('.arch');
    expect(arch).toContain(`background-color: ${MATERIALS.arch.color}`);
    expect(arch).toContain('padding: 10px');
    expect(arch).toContain('border-radius: 50% 50% 28px 28px / 44.8% 44.8% 28px 28px');
    expect(rule('.arch > .in')).toContain('44% 44% 19px 19px');
    expect(rule('.arch.sm')).toContain('padding: 7px');
    expect(rule('.arch.xs')).toContain('padding: 5px');
  });
});

describe('échelle typographique', () => {
  it('titres éditoriaux Fraunces (final.css) : taille / interligne / graisse / interlettrage', () => {
    const t = (cls: string) => {
      const m = new RegExp(`${cls.replace(/[.[\]]/g, '\\$&')} \\{ font: (\\d+) (\\d+)px/(\\d+)px var\\(--display\\);[^}]*?letter-spacing: (-?[\\d.]+)px`).exec(FINAL);
      if (!m) throw new Error(cls + ' introuvable');
      return [+m[2], +m[3], +m[1], +m[4]];
    };
    const spec = (k: keyof typeof TYPE) => [TYPE[k].fontSize, TYPE[k].lineHeight, TYPE[k].weight, TYPE[k].letterSpacing];
    expect(spec('largetitle')).toEqual(t('.largetitle'));
    expect(spec('title1')).toEqual(t('.t-title1'));
    expect(spec('title2')).toEqual(t('.t-title2'));
    expect(spec('title3')).toEqual(t('.t-title3'));
    expect(spec('sectionTitle')).toEqual(t('.sec-h h4'));
    expect(spec('navTitle')).toEqual(t('.navbar .bar .ttl'));
    for (const k of ['largetitle', 'title1', 'title2', 'title3', 'sectionTitle', 'navTitle'] as const) expect(TYPE[k].family).toBe('display');
  });

  it('texte Inter (ios27.css) : headline, body, callout, sub, foot, cap, cap2', () => {
    const t = (cls: string) => {
      const m = new RegExp(`\\.${cls} \\{ font: (\\d+) (\\d+)px/(\\d+)px[^;]*; letter-spacing: (-?[\\d.]+)(?:px)?`).exec(BASE);
      if (!m) throw new Error(cls + ' introuvable');
      return [+m[2], +m[3], +m[1], +m[4]];
    };
    const specs = { headline: 't-headline', body: 't-body', callout: 't-callout', sub: 't-sub', foot: 't-foot', cap: 't-cap', cap2: 't-cap2' } as const;
    for (const [key, cls] of Object.entries(specs)) {
      const s = TYPE[key as keyof typeof TYPE];
      expect([s.fontSize, s.lineHeight, s.weight, s.letterSpacing]).toEqual(t(cls));
      expect(s.family).toBeUndefined();
    }
  });

  it('étiquettes en capitales espacées (.eyebrow 12/16 700 .12em, .kick 11,5/16 700 .1em)', () => {
    expect(TYPE.eyebrow).toMatchObject({ fontSize: 12, lineHeight: 16, weight: 700, uppercase: true });
    expect(TYPE.eyebrow.letterSpacing).toBeCloseTo(12 * 0.12, 5);
    expect(TYPE.kick).toMatchObject({ fontSize: 11.5, lineHeight: 16, weight: 700, uppercase: true });
    expect(TYPE.kick.letterSpacing).toBeCloseTo(11.5 * 0.1, 5);
  });
});

describe('barres d’onglets relevées sur les écrans K, G, S, U de v4.html / v5.html', () => {
  it('Lin : Coach (bulle, messages) ; Veillée : Ce soir (lecture, maison) ; feutre dans les deux cas', () => {
    expect(TAB_LAYOUTS.lin.prominent).toMatchObject({ label: 'Coach', glyph: 'chat', route: 'messages', tone: 'felt' });
    expect(TAB_LAYOUTS.veillee.prominent).toMatchObject({ label: 'Ce soir', glyph: 'play', route: 'maison', tone: 'felt' });
  });
  it('Maison · Bilan · Mes séances (maison, étincelles, calendrier) dans les deux styles', () => {
    for (const s of STYLE_KEYS) {
      expect(TAB_LAYOUTS[s].tabs.map((t) => t.label)).toEqual(['Maison', 'Bilan', 'Mes séances']);
      expect(TAB_LAYOUTS[s].tabs.map((t) => t.glyph)).toEqual(['home', 'sparkles', 'calendar']);
    }
  });
});

describe('icons.tsx = tracés des maquettes finales', () => {
  it('chaque tracé `d` de icons.tsx figure tel quel dans icons.js ou screens-final.js', () => {
    const src = readFileSync(resolve(__dirname, 'icons.tsx'), 'utf8');
    const ds = [...src.matchAll(/d: '([^']+)'/g)].map((m) => m[1]);
    expect(ds.length).toBeGreaterThan(50);
    const hay = readFileSync(resolve(DIR, 'icons.js'), 'utf8') + readFileSync(resolve(DIR, 'screens-final.js'), 'utf8');
    expect(ds.filter((d) => !hay.includes(d))).toEqual([]);
  });
});

describe('withAlpha', () => {
  it('convertit hex et rgba', () => {
    expect(withAlpha('#F7F5F2', 0.78)).toBe('rgba(247,245,242,0.78)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255,255,255,0.5)');
    expect(withAlpha('rgba(60,60,67,0.74)', 0.5)).toBe('rgba(60,60,67,0.37)');
  });
});
