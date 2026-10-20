/**
 * Matières « Soir de famille » traduites de final.css en spécifications pures (sans react-native) :
 * quelle tuile, quel mélange, quelle ombre. Les composants (Materials.tsx, Arch.tsx, Star.tsx) ne font que les poser.
 */
import { COLORS, MATERIALS, type StyleKey } from './tokens';

export type TextureName =
  | 'grain' | 'grainSoft' | 'felt' | 'feltStrong' | 'enamel' | 'paper' | 'linen' | 'laid' | 'ribs';

/** Nom de fichier de chaque tuile dans assets/brand/textures. */
export const TEXTURE_FILES: Record<TextureName, string> = {
  grain: 'grain.png',
  grainSoft: 'grain-soft.png',
  felt: 'felt.png',
  feltStrong: 'felt-strong.png',
  enamel: 'enamel.png',
  paper: 'paper.png',
  linen: 'linen.png',
  laid: 'laid.png',
  ribs: 'ribs.png',
};

/** Poids maximal d'une tuile (octets). */
export const TEXTURE_MAX_BYTES = 20 * 1024;

/** Mélange CSS `background-blend-mode` : doux pour feutre/émail/grain, normal pour papier, lin, vergé, côtes. */
export type TextureBlend = 'soft-light' | 'normal';

export const TEXTURE_BLEND: Record<TextureName, TextureBlend> = {
  grain: 'soft-light',
  grainSoft: 'normal',
  felt: 'soft-light',
  feltStrong: 'soft-light',
  enamel: 'soft-light',
  paper: 'normal',
  linen: 'normal',
  laid: 'normal',
  ribs: 'normal',
};

export type PaperSpec = {
  /** Couleur de fond : `--paper` du style (crème #FFFEFB en Lin, #F7F5F2 en Veillée). */
  background: string;
  /** Encre : TOUJOURS marine, dans les deux styles. */
  ink: string;
  ink2: string;
  sage: string;
  textures: readonly TextureName[];
  frame: boolean;
};

/** `.paper`, `.paper.laid`, `.frame`. */
export function paperSpec(style: StyleKey, opts: { laid?: boolean; framed?: boolean } = {}): PaperSpec {
  const m = MATERIALS.paper;
  return {
    background: COLORS[style].paper,
    ink: m.ink,
    ink2: m.ink2,
    sage: m.sage,
    textures: opts.laid ? ['paper', 'laid'] : ['paper'],
    frame: !!opts.framed,
  };
}

export type FeltSpec = { background: string; ink: string; texture: TextureName; edge: string | null };

/** `.felt` / `.felt-strong` : le feutre marine ; en Veillée, l'onglet Prominent est un feutre plus clair, cerclé. */
export function feltSpec(style: StyleKey, opts: { strong?: boolean; raised?: boolean } = {}): FeltSpec {
  const m = MATERIALS.felt;
  const night = style === 'veillee' && !!opts.raised;
  return {
    background: night ? m.veilleeColor : m.color,
    ink: m.ink,
    texture: opts.strong ? 'feltStrong' : 'felt',
    edge: night ? m.veilleeEdge : null,
  };
}

/** `.velvet` : velours côtelé — identique dans les deux styles. */
export function velvetSpec() {
  const m = MATERIALS.velvet;
  return { background: m.color, ink: m.ink, textures: ['ribs', 'grainSoft'] as const satisfies readonly TextureName[] };
}

/** `.enamel` : le seul geste jaune. */
export function enamelSpec() {
  const m = MATERIALS.enamel;
  return { background: m.color, ink: m.ink, texture: 'enamel' as const satisfies TextureName, stops: [m.highlight, m.mid, m.low] as const };
}

/** `.star-on` / `.star-off`. */
export function starSpec(style: StyleKey, on: boolean) {
  const m = MATERIALS.star;
  return on
    ? { fill: m.onMid, stops: [m.onHigh, m.onMid, m.onLow] as const, ink: m.onInk, glow: COLORS[style].starGlow }
    : { fill: m.offFill, stops: null, ink: m.offInk, glow: null };
}

/** Dimensions d'une arche de lin : intérieur (fenêtre) et rayons elliptiques des coins hauts. */
export function archGeometry(width: number, height: number, size: 'md' | 'sm' | 'xs') {
  const s = MATERIALS.arch.sizes[size];
  const innerW = Math.max(0, width - 2 * s.padding);
  const innerH = Math.max(0, height - 2 * s.padding);
  return {
    padding: s.padding,
    outer: { width, height, rx: width / 2, ry: height * MATERIALS.arch.topRadiusRatio, bottom: s.bottomRadius },
    inner: { x: s.padding, y: s.padding, width: innerW, height: innerH, rx: innerW / 2, ry: innerH * MATERIALS.arch.innerTopRadiusRatio, bottom: s.innerBottomRadius },
  };
}

/**
 * Tracé SVG d'une arche : demi-ellipse en haut (rx = moitié de la largeur, ry = ratio de la hauteur),
 * coins bas circulaires de rayon `bottom`. `x`, `y` = coin haut gauche.
 */
export function archPath(x: number, y: number, w: number, h: number, ry: number, bottom: number): string {
  const rx = w / 2;
  const r = Math.min(bottom, w / 2, h / 2);
  const top = Math.min(ry, h - r);
  return [
    `M ${x} ${y + top}`,
    `A ${rx} ${top} 0 0 1 ${x + w} ${y + top}`,
    `L ${x + w} ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    'Z',
  ].join(' ');
}
