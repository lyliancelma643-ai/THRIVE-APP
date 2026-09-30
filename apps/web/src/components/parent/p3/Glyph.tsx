'use client';

// Pictogrammes des émotions, des outils et des lieux — dessinés en SVG dans les
// couleurs de la charte, à la place des emoji (DESIGN_TOKENS §10 : jamais d'emoji
// comme icône d'interface). `e` reçoit l'ancien caractère pour ne pas toucher aux
// données ; un caractère inconnu donne une pastille sauge.

import type { ReactNode } from 'react';

const D = '#022539';
const K = '#F7F5F2';
const S = '#F9EB50';
const SG = '#A7C4BC';
const SL = '#C9DCD6';
const N = '#004E7A';
const M = '#3380AC';
const P = '#67A4C9';

const st = { stroke: D, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
const Face = ({ f, children }: { f: string; children: ReactNode }) => (
  <>
    <circle cx={24} cy={24} r={21} fill={f} stroke={D} strokeWidth={2.2} />
    {children}
  </>
);
const Eyes = ({ c = D, y = 20, r = 2.4 }: { c?: string; y?: number; r?: number }) => (
  <>
    <circle cx={16.5} cy={y} r={r} fill={c} />
    <circle cx={31.5} cy={y} r={r} fill={c} />
  </>
);

const G: Record<string, ReactNode> = {
  '😄': (
    <Face f={S}>
      <path d="M14 19 Q16.5 15.5 19 19 M29 19 Q31.5 15.5 34 19" {...st} />
      <path d="M13 28 Q24 40 35 28Z" fill={D} stroke={D} strokeWidth={1.6} strokeLinejoin="round" />
    </Face>
  ),
  '😨': (
    <Face f={P}>
      <circle cx={16.5} cy={20} r={4.6} fill={K} stroke={D} strokeWidth={1.8} />
      <circle cx={31.5} cy={20} r={4.6} fill={K} stroke={D} strokeWidth={1.8} />
      <Eyes y={20} r={1.6} />
      <ellipse cx={24} cy={34} rx={3.6} ry={4.4} fill={D} />
      <path d="M11 12 L20 14 M37 12 L28 14" {...st} />
    </Face>
  ),
  '😠': (
    <Face f={N}>
      <path d="M11 14 L21 19 M37 14 L27 19" stroke={K} strokeWidth={2.6} strokeLinecap="round" />
      <Eyes c={K} y={22} />
      <path d="M16 35 Q24 29 32 35" stroke={K} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </Face>
  ),
  '😤': (
    <Face f={P}>
      <path d="M12 16 L21 19 M36 16 L27 19" {...st} />
      <Eyes y={22} />
      <path d="M17 33 H31" {...st} />
      <path d="M9 30 Q5 28 6 24 M39 30 Q43 28 42 24" {...st} strokeWidth={1.8} />
    </Face>
  ),
  '😎': (
    <Face f={SG}>
      <path d="M9 18 H39 M12 18 V24 Q12 27 16 27 H19 Q22 27 22 24 V18 M26 18 V24 Q26 27 29 27 H32 Q36 27 36 24 V18" fill={D} stroke={D} strokeWidth={2} strokeLinejoin="round" />
      <path d="M17 33 Q24 39 31 33" {...st} />
    </Face>
  ),
  '😬': (
    <Face f={SL}>
      <Eyes y={19} />
      <rect x={13} y={28} width={22} height={9} rx={3} fill={K} stroke={D} strokeWidth={2} />
      <path d="M20.5 28 V37 M27.5 28 V37 M13 32.5 H35" stroke={D} strokeWidth={1.6} />
    </Face>
  ),
  '🙂': (
    <Face f={K}>
      <Eyes y={20} />
      <path d="M16 31 Q24 37 32 31" {...st} />
    </Face>
  ),
  '😔': (
    <Face f={SL}>
      <path d="M12 16 L20 13 M36 16 L28 13" {...st} strokeWidth={1.8} />
      <Eyes y={22} />
      <path d="M17 35 Q24 29 31 35" {...st} />
    </Face>
  ),
  '😴': (
    <Face f={SL}>
      <path d="M13 21 H20 M28 21 H35" {...st} />
      <path d="M18 33 Q24 36 30 33" {...st} />
      <path d="M36 6 H43 L36 13 H43" {...st} strokeWidth={1.8} />
    </Face>
  ),
  '⚡': <path d="M27 3 L9 27 H22 L19 45 L39 18 H25Z" fill={S} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />,
  '🌪': <path d="M6 10 H42 M10 18 H38 M15 26 H34 M19 34 H30 M23 42 H27" {...st} strokeWidth={3.4} stroke={M} />,
  '☀': (
    <>
      <circle cx={24} cy={24} r={9} fill={S} stroke={D} strokeWidth={2.2} />
      <path d="M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M10.5 37.5 L14 34 M34 14 L37.5 10.5" {...st} />
    </>
  ),
  '💪': <path d="M8 34 Q8 16 24 14 Q26 8 32 10 Q36 12 34 18 Q40 22 38 32 Q34 40 22 40 Q12 40 8 34Z" fill={S} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />,
  '✋': <path d="M14 26 V12 a3 3 0 0 1 6 0 V22 V8 a3 3 0 0 1 6 0 V22 V10 a3 3 0 0 1 6 0 V24 V16 a3 3 0 0 1 6 0 V30 Q38 42 26 42 Q16 42 12 34 L9 28 a3 3 0 0 1 5-3Z" fill={SG} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />,
  '🪜': <path d="M13 4 V44 M35 4 V44 M13 12 H35 M13 22 H35 M13 32 H35 M13 41 H35" {...st} strokeWidth={3} />,
  '🎯': (
    <>
      <circle cx={24} cy={24} r={20} fill={K} stroke={D} strokeWidth={2.2} />
      <circle cx={24} cy={24} r={13} fill={SG} stroke={D} strokeWidth={2} />
      <circle cx={24} cy={24} r={6} fill={S} stroke={D} strokeWidth={2} />
    </>
  ),
  '🎭': (
    <>
      <path d="M5 10 Q5 26 14 30 Q24 26 24 10Z" fill={S} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M22 18 Q22 38 32 42 Q43 38 43 18Z" fill={SG} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M9 17 H12 M17 17 H20 M27 26 H30 M35 26 H38" {...st} strokeWidth={2.4} />
    </>
  ),
  '🎈': (
    <>
      <path d="M24 34 C26 40 22 42 24 46" {...st} />
      <ellipse cx={24} cy={19} rx={13} ry={16} fill={M} stroke={D} strokeWidth={2.2} />
      <path d="M21 34 L27 34 L24 38Z" fill={M} stroke={D} strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx={19} cy={13} rx={3} ry={5} fill={K} opacity={0.6} />
    </>
  ),
  '💬': (
    <>
      <path d="M8 10 H40 a4 4 0 0 1 4 4 V28 a4 4 0 0 1 -4 4 H22 L12 41 V32 H8 a4 4 0 0 1 -4 -4 V14 a4 4 0 0 1 4 -4Z" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={16} cy={21} r={2} fill={D} />
      <circle cx={24} cy={21} r={2} fill={D} />
      <circle cx={32} cy={21} r={2} fill={D} />
    </>
  ),
  '🍝': <path d="M12 6 C20 14 8 22 16 30 S14 42 18 44 M22 6 C30 14 18 22 26 30 S24 42 28 44 M32 6 C40 14 28 22 36 30 S34 42 38 44" {...st} stroke={D} strokeWidth={3.2} />,
  '🤝': (
    <>
      <circle cx={15} cy={12} r={6} fill={SG} stroke={D} strokeWidth={2.2} />
      <circle cx={33} cy={12} r={6} fill={K} stroke={D} strokeWidth={2.2} />
      <rect x={7} y={21} width={16} height={22} rx={8} fill={SG} stroke={D} strokeWidth={2.2} />
      <rect x={25} y={21} width={16} height={22} rx={8} fill={K} stroke={D} strokeWidth={2.2} />
    </>
  ),
  '🔦': (
    <>
      <path d="M6 18 H22 L30 10 V38 L22 30 H6Z" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M34 14 L44 8 M35 24 H46 M34 34 L44 40" {...st} stroke={N} strokeWidth={2.6} />
    </>
  ),
  '🎬': (
    <>
      <rect x={5} y={18} width={38} height={24} rx={3} fill={K} stroke={D} strokeWidth={2.2} />
      <path d="M5 18 L9 6 L43 12 L42 18Z" fill={D} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M15 8 L19 17 M26 9 L30 18 M36 11 L40 18" stroke={K} strokeWidth={2.2} />
      <path d="M21 25 L30 30 L21 35Z" fill={S} stroke={D} strokeWidth={1.8} strokeLinejoin="round" />
    </>
  ),
  '👀': (
    <>
      <path d="M3 24 Q13 10 24 24 Q13 38 3 24Z" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M24 24 Q35 10 45 24 Q35 38 24 24Z" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={14} cy={24} r={4} fill={N} />
      <circle cx={35} cy={24} r={4} fill={N} />
    </>
  ),
  '👂': <path d="M16 38 Q10 30 12 18 Q16 6 28 8 Q40 10 38 24 Q37 30 30 33 Q28 38 24 40 Q19 42 16 38Z M22 18 Q28 14 30 22 Q30 26 26 28" fill={SG} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />,
  '🏫': (
    <>
      <path d="M6 42 V20 L24 8 L42 20 V42Z" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <rect x={19} y={28} width={10} height={14} fill={N} stroke={D} strokeWidth={2} />
      <path d="M24 8 V1 L32 4 L24 6" fill={S} stroke={D} strokeWidth={1.8} strokeLinejoin="round" />
    </>
  ),
  '👫': (
    <>
      <circle cx={15} cy={12} r={6} fill={K} stroke={D} strokeWidth={2.2} />
      <circle cx={33} cy={12} r={6} fill={SG} stroke={D} strokeWidth={2.2} />
      <rect x={8} y={21} width={14} height={22} rx={7} fill={K} stroke={D} strokeWidth={2.2} />
      <rect x={26} y={21} width={14} height={22} rx={7} fill={SG} stroke={D} strokeWidth={2.2} />
    </>
  ),
  '🏠': (
    <>
      <path d="M5 24 L24 7 L43 24" {...st} strokeWidth={2.6} />
      <path d="M9 22 V42 H39 V22" fill={K} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />
      <rect x={20} y={28} width={9} height={14} fill={S} stroke={D} strokeWidth={2} />
    </>
  ),
};

/** Dessine le pictogramme de l'ancien caractère `e`. Décoratif (aria-hidden). */
export function Glyph({ e, className = 'w-8 h-8' }: { e: string; className?: string }) {
  const key = e.replace(/️/g, '');
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      {G[key] ?? <circle cx={24} cy={24} r={18} fill={SG} stroke={D} strokeWidth={2.2} />}
    </svg>
  );
}
