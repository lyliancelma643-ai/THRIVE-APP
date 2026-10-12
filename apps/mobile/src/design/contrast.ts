/** Contraste WCAG 2.x — logique pure, utilisée par les tests et au besoin à l'exécution. */

export type RGBA = { r: number; g: number; b: number; a: number };

export function parseColor(input: string): RGBA {
  const s = input.trim().toLowerCase();
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) throw new Error(`Couleur invalide: ${input}`);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (!m) throw new Error(`Couleur invalide: ${input}`);
  const p = m[1].split(',').map((x) => parseFloat(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
}

/** Compose `fg` (éventuellement translucide) sur `bg` opaque. */
export function composite(fg: string, bg: string): RGBA {
  const f = parseColor(fg);
  const b = parseColor(bg);
  const a = f.a;
  return {
    r: f.r * a + b.r * (1 - a),
    g: f.g * a + b.g * (1 - a),
    b: f.b * a + b.b * (1 - a),
    a: 1,
  };
}

function lin(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance({ r, g, b }: RGBA): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste de `fg` posé sur `bg` (1 à 21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(composite(fg, bg));
  const l2 = luminance(composite(bg, '#ffffff'));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA : 4,5 pour le texte courant, 3 pour le gros texte (≥ 24 pt, ou ≥ 18,66 pt gras). */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
