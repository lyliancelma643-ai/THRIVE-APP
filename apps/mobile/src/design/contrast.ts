/** Contraste WCAG 2.x — logique pure, utilisée par les tests et au besoin à l'exécution. */
import { COLORS, MATERIALS, type StyleKey } from './tokens';

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

/** Une paire encre / fond à contrôler. `min` = seuil WCAG AA (texte courant 4,5 ; gros texte ou pictogramme 3). */
export type ContrastPair = { name: string; fg: string; bg: string; min: number };

/** Aplatit une couche translucide `fg` sur un fond opaque `bg` : `rgb(r,g,b)` utilisable comme fond d'une paire. */
export function flatten(fg: string, bg: string): string {
  const c = composite(fg, bg);
  return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
}

/**
 * Toutes les paires encre / fond de l'app pour un style : surfaces courantes, barre d'onglets, pastilles, bulles,
 * papier (encre marine, y compris le papier clair de Veillée), feutre, velours, émail, étoile. Texte courant ≥ 4,5 ;
 * 3 pour les éléments non textuels (interrupteur, icône d'accent). `label3`/`label4` sont décoratifs : exclus.
 */
export function contrastPairs(style: StyleKey): ContrastPair[] {
  const c = COLORS[style];
  const m = MATERIALS;
  const surfaces: [string, string][] = [['bgGrouped', c.bgGrouped], ['bgGrouped2', c.bgGrouped2], ['bgGrouped3', c.bgGrouped3], ['elev', c.elev]];
  const tabBg = flatten(c.tab, c.bgGrouped);
  const tabActiveBg = flatten(c.tabOn, tabBg);
  const pairs: ContrastPair[] = [];
  const add = (name: string, fg: string, bg: string, min = AA_TEXT) => pairs.push({ name: `${style} · ${name}`, fg, bg, min });
  for (const [n, bg] of surfaces) {
    add(`label / ${n}`, c.label, bg);
    add(`label2 / ${n}`, c.label2, bg);
  }
  for (const [n, bg] of surfaces.slice(0, 2)) {
    add(`tintText / ${n}`, c.tintText, bg);
    add(`kidText / ${n}`, c.kidText, bg);
    add(`sageText / ${n}`, c.sageText, bg);
    add(`ok / ${n}`, c.ok, bg);
    add(`warn / ${n}`, c.warn, bg);
    add(`bad / ${n}`, c.bad, bg);
  }
  add('tint (icône) / bgGrouped', c.tint, c.bgGrouped, AA_LARGE);
  add('accentInk / accent', c.accentInk, c.accent);
  add('tintInk / tint', c.tintInk, c.tint);
  add('badgeInk / badgeBg sur bgGrouped2', c.badgeInk, flatten(c.badgeBg, c.bgGrouped2));
  add('ok / okSoft sur bgGrouped2', c.ok, flatten(c.okSoft, c.bgGrouped2));
  add('tglOn (interrupteur) / bgGrouped2', c.tglOn, c.bgGrouped2, AA_LARGE);
  add('label / bulle reçue', c.label, c.bubIn);
  add('crème / bulle envoyée', c.cream, c.bubOut);
  add('label / segment actif', c.label, flatten(c.segOn, c.bgGrouped2));
  add('label / barre d’onglets', c.label, tabBg);
  add('navActive / onglet actif', c.navActive, tabActiveBg);
  // Boutons et pastilles : feutre le jour, émail ou crème la nuit.
  if (style === 'lin') {
    add('crème / feutre (bouton, pastille active)', c.cream, m.felt.color);
  } else {
    add('marine / crème (pastille active)', c.navy900, c.cream);
    add('crème / feutre Prominent', m.felt.ink, m.felt.veilleeColor);
  }
  add('crème / feutre fort', m.felt.ink, m.felt.color);
  // Papier : l'encre est marine dans les deux styles, y compris sur le papier clair de Veillée.
  add('encre / papier', m.paper.ink, c.paper);
  add('encre 2 / papier', m.paper.ink2, c.paper);
  add('sauge / papier', m.paper.sage, c.paper);
  add('tintText / papier', m.paper.tintText, c.paper);
  // Velours (mêmes valeurs dans les deux styles).
  add('crème / velours', m.velvet.ink, m.velvet.color);
  add('crème 84 % / velours', m.velvet.ink2, m.velvet.color);
  add('crème 66 % / velours', m.velvet.ink3, m.velvet.color);
  add('soleil / velours', m.velvet.tint, m.velvet.color);
  // Émail et étoile.
  add('marine / émail', m.enamel.ink, m.enamel.color);
  add('marine / étoile allumée', m.star.onInk, m.star.onMid);
  return pairs;
}
