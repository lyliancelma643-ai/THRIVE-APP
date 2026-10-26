// Tokens de mouvement partagés web + mobile (ms ; courbes en cubic-bezier [x1, y1, x2, y2]).
export const DUR = {
  fast: 150, base: 220, slow: 300, push: 300, back: 220, tab: 300, pageOut: 140, pageIn: 260,
  hair: 700, ring: 900, count: 800, hop: 550, stairFill: 450, bar: 600, ritualMin: 2400,
} as const;

export const EASE = {
  out: [0.22, 0.61, 0.36, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.45, 0, 0.55, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

export const THRESH = {
  skeletonDelay: 400, skeletonMinShow: 300, stairMinShow: 900, slowMessage: 8000, retry: 20000, tipSwap: 3500, stageMinDwell: 450,
} as const;

export const STAGGER = { skeletonWave: 80, skeletonWaveMax: 8, contentRise: 60, contentRiseMax: 6 } as const;

/** Retard d'un élément dans une cascade (index plafonné). */
export function stagger(index: number, step: number, max: number): number {
  return Math.min(Math.max(0, index), max) * step;
}
