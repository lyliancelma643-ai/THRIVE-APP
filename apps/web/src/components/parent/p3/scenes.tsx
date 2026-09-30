'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Une petite scène animée par activité (direction « Soir de famille »).
//
// Chaque scène est dessinée à la main pour son activité : le ballon qui respire,
// la tour de gobelets qui tombe, le projecteur qui balaie, la roue des six…
// Couleurs : uniquement la charte (marine, crème, jaune soleil, sauge).
// Mouvement : transform / opacité seulement (classes .sc-* dans globals.css),
// coupé par « réduire les animations ».
// Les scènes habillent le disque derrière la mascotte : elles vivent surtout sur
// le pourtour, la chèvre garde le centre.
// ─────────────────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';

const C = {
  navy: '#004E7A',
  deep: '#022539',
  cream: '#F7F5F2',
  sun: '#F9EB50',
  sage: '#A7C4BC',
  sageL: '#C9DCD6',
  sageD: '#7FA197',
  mid: '#3380AC',
  pale: '#9CC4DD',
} as const;

type GProps = {
  a?: string;
  d?: number;
  t?: number;
  x?: number;
  y?: number;
  s?: number;
  r?: number;
  o?: string;
  v?: Record<string, string | number>;
  children?: ReactNode;
};

/** Un groupe placé (x, y, échelle, rotation) qui porte éventuellement une animation. */
function G({ a, d = 0, t, x = 0, y = 0, s = 1, r = 0, o, v, children }: GProps) {
  const style: Record<string, string | number> = { '--d': `${d}s`, ...v };
  if (t) style['--t'] = `${t}s`;
  if (o) style.transformOrigin = o;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g className={a ? `sc sc-${a}` : undefined} style={style as CSSProperties}>
        {children}
      </g>
    </g>
  );
}

const pts = (r: number, n = 5, k = 0.45) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r * k : r;
    return `${(Math.cos(ang) * rr).toFixed(1)},${(Math.sin(ang) * rr).toFixed(1)}`;
  }).join(' ');

const OUT = { stroke: C.deep, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

const Star = ({ r = 10, f = C.sun }: { r?: number; f?: string }) => <polygon points={pts(r)} fill={f} {...OUT} />;
const Dot = ({ r = 3, f = C.sun }: { r?: number; f?: string }) => <circle r={r} fill={f} />;
const Check = ({ c = C.deep }: { c?: string }) => <path d="M-5 0 L-1 4 L6 -5" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />;
const Heart = ({ f = C.sun }: { f?: string }) => <path d="M0 8 C-14 -2 -8 -14 0 -6 C8 -14 14 -2 0 8Z" fill={f} {...OUT} />;
const Person = ({ f = C.navy, h = C.cream }: { f?: string; h?: string }) => (
  <g {...OUT}>
    <circle cy={-15} r={7} fill={h} />
    <rect x={-9} y={-6} width={18} height={24} rx={9} fill={f} />
  </g>
);
const Cup = ({ f = C.cream }: { f?: string }) => <path d="M-10 -9 L10 -9 L7 9 L-7 9Z" fill={f} {...OUT} />;
const Balloon = ({ f = C.mid }: { f?: string }) => (
  <g {...OUT}>
    <path d="M0 18 C2 26 -2 30 0 36" fill="none" />
    <ellipse rx={14} ry={17} fill={f} />
    <path d="M-3 17 L3 17 L0 21Z" fill={f} />
    <ellipse cx={-5} cy={-6} rx={3} ry={5} fill={C.cream} opacity={0.55} stroke="none" />
  </g>
);
const Bubble = ({ w = 40, h = 26, f = C.cream, tail = 'l' }: { w?: number; h?: number; f?: string; tail?: 'l' | 'r' }) => (
  <g {...OUT}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={f} />
    <path d={tail === 'l' ? `M${-w / 2 + 8} ${h / 2 - 1} l-4 9 l12 -8Z` : `M${w / 2 - 8} ${h / 2 - 1} l4 9 l-12 -8Z`} fill={f} />
  </g>
);
const Ball = ({ r = 6 }: { r?: number }) => <circle r={r} fill={C.cream} {...OUT} />;
const Box = ({ w = 34, h = 22 }: { w?: number; h?: number }) => (
  <g {...OUT}>
    <path d={`M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} L${w / 2 - 4} ${h / 2} L${-w / 2 + 4} ${h / 2}Z`} fill={C.sage} />
  </g>
);
const Steps = ({ n = 4, w = 22, h = 14, lit = n }: { n?: number; w?: number; h?: number; lit?: number }) => (
  <g {...OUT}>
    {Array.from({ length: n }, (_, i) => (
      <rect key={i} x={i * w} y={-(i + 1) * h} width={w} height={(i + 1) * h} fill={i < lit ? C.sun : C.cream} />
    ))}
  </g>
);
const Flag = ({ f = C.navy }: { f?: string }) => (
  <g {...OUT}>
    <path d="M0 0 V-34" fill="none" />
    <path d="M0 -34 L22 -28 L0 -20Z" fill={f} />
  </g>
);
const Line = ({ d, c = C.deep, w = 1.8, dash }: { d: string; c?: string; w?: number; dash?: string }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
);
const Cloud = ({ f = C.cream }: { f?: string }) => (
  <path d="M-18 6 C-28 6 -28 -8 -16 -8 C-14 -20 6 -22 10 -10 C24 -12 28 6 16 6Z" fill={f} {...OUT} />
);
const Env = ({ f = C.cream }: { f?: string }) => (
  <g {...OUT}>
    <rect x={-20} y={-13} width={40} height={26} rx={4} fill={f} />
    <path d="M-20 -11 L0 4 L20 -11" fill="none" />
  </g>
);
const Pin = ({ f = C.sun }: { f?: string }) => (
  <g {...OUT}>
    <path d="M0 14 C-12 -2 -10 -16 0 -16 C10 -16 12 -2 0 14Z" fill={f} />
    <circle cy={-6} r={3.5} fill={C.deep} stroke="none" />
  </g>
);
const Card = ({ w = 22, h = 30, f = C.cream }: { w?: number; h?: number; f?: string }) => <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={f} {...OUT} />;
const Tent = () => (
  <g {...OUT}>
    <path d="M-28 16 L0 -22 L28 16Z" fill={C.sage} />
    <path d="M-8 16 L0 -4 L8 16Z" fill={C.deep} />
  </g>
);
const Conf = ({ f }: { f: string }) => <rect x={-3} y={-5} width={6} height={10} rx={1.5} fill={f} />;

const tri = (n: number) => Array.from({ length: n }, (_, i) => i);

type SceneFn = () => ReactNode;

const SCENES: Record<string, SceneFn> = {
  // ── Semaine 1 · reconnaître ses forces ────────────────────────────────────
  // Trois étoiles qui s'allument une à une, chacune suivie de sa preuve (la coche).
  'ACT-0101': () => (
    <>
      {[[46, 70], [100, 38], [154, 70]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="appear" d={i * 0.8} t={5}>
          <Star r={14} />
        </G>
      ))}
      {[[46, 94], [100, 62], [154, 94]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="appear" d={i * 0.8 + 0.4} t={5}>
          <Check />
        </G>
      ))}
    </>
  ),
  // Dix minutes, c'est lui qui décide : un fanion planté et une horloge qui tourne.
  'ACT-0102': () => (
    <>
      <G x={44} y={150} a="sway" t={3} o="50% 100%">
        <Flag f={C.sun} />
      </G>
      <G x={152} y={52}>
        <circle r={22} fill={C.cream} {...OUT} />
        <G a="spin" t={10}>
          <Line d="M0 0 V-15" w={2.4} />
        </G>
        <Line d="M0 0 L9 4" w={2.4} />
      </G>
      <G x={150} y={148} a="float" t={3.5}>
        <Star r={9} />
      </G>
    </>
  ),
  // Le rêve de l'année : un nuage-pensée d'où monte une étoile.
  'ACT-0103': () => (
    <>
      <G x={100} y={44}>
        <Cloud />
      </G>
      <G x={100} y={44} a="rise" t={4.5}>
        <Star r={9} />
      </G>
      {[[36, 120], [168, 110], [150, 160]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="twinkle" d={i * 0.7} t={3}>
          <Star r={6} f={C.cream} />
        </G>
      ))}
      <G x={42} y={60} a="float" t={5}>
        <path d="M0 -14 A14 14 0 1 0 12 10 A11 11 0 0 1 0 -14Z" fill={C.sun} {...OUT} />
      </G>
    </>
  ),
  'ACT-0104': () => (
    <>
      <G x={44} y={140}>
        <Person />
      </G>
      <G x={156} y={140}>
        <Person f={C.mid} />
      </G>
      {[[30, 88], [100, 42], [170, 88]].map(([x, y], i) => (
        <G key={i} x={x} y={y}>
          <g opacity={0.9}>
            <polygon points={pts(11)} fill="none" stroke={C.deep} strokeWidth={1.6} strokeDasharray="3 3" />
          </g>
          <G a="appear" d={i * 1.1} t={5}>
            <Star r={11} />
          </G>
        </G>
      ))}
      <G x={100} y={150} a="pulse" t={2.5}>
        <Heart />
      </G>
    </>
  ),

  // ── Semaine 2 · objectif d'effort, plan ───────────────────────────────────
  // Deux colonnes : ce qui dépend de lui se coche, le reste s'envole en nuage.
  'ACT-0201': () => (
    <>
      <G x={24} y={120}>
        <rect width={62} height={60} rx={10} fill={C.cream} {...OUT} />
      </G>
      {[0, 1, 2].map((i) => (
        <G key={i} x={44} y={138 + i * 17} a="appear" d={i * 0.9} t={4.5}>
          <Check />
        </G>
      ))}
      <G x={114} y={120}>
        <rect width={62} height={60} rx={10} fill="none" stroke={C.deep} strokeWidth={1.6} strokeDasharray="4 4" />
      </G>
      <G x={146} y={150} a="drift" t={6}>
        <Cloud f={C.sage} />
      </G>
      <G x={100} y={44} a="float" t={4}>
        <Star r={10} />
      </G>
    </>
  ),
  // Une marche à la fois : la première s'allume, un point la monte, le fanion flotte.
  'ACT-0202': () => (
    <>
      <G x={94} y={170}>
        <Steps n={4} lit={1} w={18} h={12} />
      </G>
      <G x={100} y={156} a="climb" t={4}>
        <circle r={5} fill={C.navy} {...OUT} />
      </G>
      <G x={168} y={112} a="sway" t={2.6} o="0% 100%">
        <Flag />
      </G>
    </>
  ),
  'ACT-0203': () => (
    <>
      {[[30, 150, 40], [84, 122, 36], [132, 96, 40]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={10} rx={3} fill={C.cream} {...OUT} />
      ))}
      <G x={46} y={150} a="hop" t={4}>
        <rect x={-6} y={-12} width={12} height={12} rx={2} fill={C.navy} {...OUT} />
      </G>
      <G x={152} y={70} a="bob" t={1.6}>
        <circle r={10} fill={C.sun} {...OUT} />
        <Star r={5} f={C.deep} />
      </G>
      <G x={50} y={54} a="twinkle" t={2.4}>
        <rect width={8} height={8} fill={C.cream} />
      </G>
    </>
  ),
  'ACT-0204': () => (
    <>
      {[[46, 138], [154, 138]].map(([x, y], i) => (
        <G key={i} x={x} y={y}>
          <rect x={-22} y={-26} width={44} height={52} rx={5} fill={C.cream} {...OUT} />
          <Line d={i ? 'M-12 -10 Q0 -22 12 -6 T12 12' : 'M-12 -8 L12 -8 M-12 2 L6 2 M-12 12 L12 12'} w={1.8} />
        </G>
      ))}
      <G a="slide" t={5} v={{ '--dx': '108px' }} x={46} y={60}>
        <circle r={16} fill={C.cream} opacity={0.6} {...OUT} />
        <Line d="M11 11 L24 24" w={4} />
      </G>
    </>
  ),

  // ── Semaine 3 · les preuves, le courage ───────────────────────────────────
  // Un mur de briques, et une coche qui tombe sur chaque brique : tout ce qu'il sait faire.
  'ACT-0301': () => (
    <>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const x = 30 + col * 46 + (row % 2 ? 14 : 0);
          return <rect key={`${row}${col}`} x={x} y={112 + row * 22} width={42} height={18} rx={3} fill={C.cream} {...OUT} />;
        })
      )}
      {[[52, 121], [106, 121], [80, 143], [134, 143], [56, 165], [110, 165]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="appear" d={i * 0.55} t={5}>
          <Check c={C.navy} />
        </G>
      ))}
      <G x={152} y={52} a="pulse" t={3}>
        <Star r={11} />
      </G>
    </>
  ),
  // Le défi une fois sur trois : deux boulettes trop courtes, la troisième dans la boîte.
  'ACT-0302': () => (
    <>
      <G x={158} y={148}>
        <Box />
      </G>
      <G x={40} y={150} a="toss" d={0} t={6} v={{ '--dx': '92px', '--dy': '8px', '--lift': '-30px' }}>
        <Ball />
      </G>
      <G x={40} y={150} a="toss" d={2} t={6} v={{ '--dx': '150px', '--dy': '20px', '--lift': '-36px' }}>
        <Ball />
      </G>
      <G x={40} y={150} a="toss" d={4} t={6} v={{ '--dx': '118px', '--dy': '-2px', '--lift': '-50px' }}>
        <Ball />
      </G>
      <G x={158} y={52} a="twinkle" d={4.5} t={6}>
        <Star r={10} />
      </G>
    </>
  ),
  // L'histoire du raté : un adulte tombe, se relève, et recommence.
  'ACT-0303': () => (
    <>
      <G x={100} y={152} a="fall" t={4.4} o="50% 100%">
        <Person f={C.sage} />
      </G>
      <G x={100} y={176}>
        <path d="M-50 0 H50" stroke={C.deep} strokeWidth={1.6} strokeLinecap="round" />
      </G>
      <G x={158} y={56} a="pulse" t={4.4} d={2.2}>
        <Heart />
      </G>
      <G x={44} y={60} a="twinkle" t={3}>
        <Star r={7} f={C.cream} />
      </G>
    </>
  ),
  // Même si j'ai peur : un pas en avant, et l'ombre de la peur reste derrière.
  'ACT-0304': () => (
    <>
      <G x={50} y={152} a="step" t={4.2} v={{ '--dx': '70px' }}>
        <Person />
      </G>
      <G x={44} y={120} a="shrink" t={4.2}>
        <Cloud f={C.deep} />
      </G>
      <G x={156} y={60} a="pulse" t={1.8}>
        <Heart />
      </G>
    </>
  ),
  // L'échelle du courage : on grimpe barreau par barreau, le premier d'abord.
  'ACT-0305': () => (
    <>
      <G x={140} y={176}>
        <Line d="M-16 0 V-130 M16 0 V-130" w={3} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Line key={i} d={`M-16 ${-14 - i * 26} H16`} w={3} c={i === 0 ? C.navy : C.deep} />
        ))}
      </G>
      <G x={140} y={162} a="ladder" t={5}>
        <circle r={6} fill={C.sun} {...OUT} />
      </G>
      <G x={56} y={150} a="pulse" t={2.4}>
        <Heart />
      </G>
    </>
  ),

  // ── Semaine 4 · les six émotions ──────────────────────────────────────────
  // La roue des six tourne doucement (petite, en haut : la grande est sur l'illustration), l'aiguille reste fixe.
  'ACT-0401': () => (
    <>
      <G x={150} y={58} a="spin" t={24}>
        {tri(6).map((i) => {
          const a0 = (i * 60 - 90) * (Math.PI / 180);
          const a1 = ((i + 1) * 60 - 90) * (Math.PI / 180);
          const R = 32;
          const fills = [C.cream, C.sage, C.sun, C.pale, C.sageL, C.mid];
          return <path key={i} d={`M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R}Z`} fill={fills[i]} {...OUT} />;
        })}
      </G>
      <G x={150} y={18}>
        <path d="M-6 -3 L6 -3 L0 10Z" fill={C.deep} />
      </G>
      {[[40, 150, 0], [62, 172, 1.2]].map(([x, y, d], i) => (
        <G key={i} x={x} y={y} a="twinkle" d={d} t={3.2}>
          <Star r={7} />
        </G>
      ))}
    </>
  ),
  // La tour de gobelets vacille, tombe, et le mot « ! » apparaît.
  'ACT-0402': () => (
    <>
      <G x={100} y={170} a="wobble" t={5} o="50% 100%">
        {[[-22, 0], [0, 0], [22, 0], [-11, -18], [11, -18], [0, -36]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y - 9})`}>
            <Cup f={i > 2 ? C.sun : C.cream} />
          </g>
        ))}
      </G>
      <G x={150} y={56} a="appear" t={5} d={2.6}>
        <Bubble w={30} h={24} tail="l" />
        <text x={0} y={5} textAnchor="middle" fontSize={15} fontWeight={800} fill={C.deep}>!</text>
      </G>
    </>
  ),
  // Où je l'ai déjà sentie : une épingle qui se pose sur l'école, puis sur les copains.
  'ACT-0403': () => (
    <>
      <G x={46} y={150}>
        <path d="M-20 10 V-8 L0 -24 L20 -8 V10Z" fill={C.cream} {...OUT} />
        <rect x={-5} y={-2} width={10} height={12} fill={C.navy} />
      </G>
      <G x={150} y={150}>
        <circle cx={-8} cy={-6} r={6} fill={C.sage} {...OUT} />
        <circle cx={8} cy={-6} r={6} fill={C.cream} {...OUT} />
        <rect x={-14} y={0} width={12} height={14} rx={6} fill={C.sage} {...OUT} />
        <rect x={2} y={0} width={12} height={14} rx={6} fill={C.cream} {...OUT} />
      </G>
      <G x={46} y={104} a="pinpop" t={5}>
        <Pin />
      </G>
      <G x={150} y={104} a="pinpop" t={5} d={2.5}>
        <Pin f={C.cream} />
      </G>
    </>
  ),
  // Le monstre du trac : une boule de poils avec son étiquette de prénom qui se balance.
  'ACT-0404': () => (
    <>
      <G x={52} y={140} a="bob" t={2.6}>
        <path d="M-20 12 C-28 -10 -10 -24 0 -24 C12 -24 28 -10 20 12 C12 18 -12 18 -20 12Z" fill={C.deep} {...OUT} />
        <circle cx={-7} cy={-6} r={5} fill={C.cream} />
        <circle cx={7} cy={-6} r={5} fill={C.cream} />
        <circle cx={-7} cy={-5} r={2} fill={C.deep} />
        <circle cx={7} cy={-5} r={2} fill={C.deep} />
        <path d="M-6 6 Q0 10 6 6" fill="none" stroke={C.cream} strokeWidth={2} strokeLinecap="round" />
      </G>
      <G x={150} y={56} a="sway" t={3} o="50% 0%">
        <Line d="M0 -14 V0" w={1.8} />
        <rect x={-22} y={0} width={44} height={20} rx={4} fill={C.sun} {...OUT} />
        <Line d="M-12 10 H12" w={2} />
      </G>
    </>
  ),

  // ── Semaine 5 · faire redescendre ─────────────────────────────────────────
  // Deux outils : le ballon qui respire, la phrase qui apparaît.
  'ACT-0501': () => (
    <>
      <G x={44} y={112} a="breathe" t={7} o="50% 100%">
        <Balloon />
      </G>
      <G x={156} y={64} a="appear" t={7} d={3}>
        <Bubble w={46} h={28} tail="r" />
        <G y={-1}>
          <Star r={7} />
        </G>
      </G>
    </>
  ),
  // La revanche de la tour : on la reconstruit gobelet par gobelet, en respirant.
  'ACT-0502': () => (
    <>
      {[[-22, 0], [0, 0], [22, 0], [-11, -18], [11, -18], [0, -36]].map(([x, y], i) => (
        <G key={i} x={100 + x} y={170 + y - 9} a="appear" d={i * 0.6} t={6}>
          <Cup f={i > 2 ? C.sun : C.cream} />
        </G>
      ))}
      <G x={40} y={78} a="breathe" t={7} o="50% 100%" s={0.8}>
        <Balloon />
      </G>
    </>
  ),
  // Là où ça monte : un thermomètre dont le mercure monte… et redescend.
  'ACT-0503': () => (
    <>
      <G x={150} y={172}>
        <rect x={-7} y={-120} width={14} height={104} rx={7} fill={C.cream} {...OUT} />
        <circle cy={-6} r={12} fill={C.cream} {...OUT} />
      </G>
      <G x={150} y={166} a="mercury" t={6} o="50% 100%">
        <rect x={-3} y={-100} width={6} height={90} rx={3} fill={C.navy} />
        <circle cy={0} r={8} fill={C.navy} />
      </G>
      <G x={52} y={150} a="bob" t={3}>
        <Pin />
      </G>
    </>
  ),
  // Les phrases qui relèvent : la bulle pousse vers le haut, le personnage se redresse.
  'ACT-0504': () => (
    <>
      <G x={56} y={152} a="rise2" t={4.6}>
        <Person f={C.sage} />
      </G>
      <G x={142} y={62} a="float" t={3.6}>
        <Bubble w={52} h={30} tail="l" />
        <Line d="M-8 4 L0 -6 L8 4" w={2.4} c={C.navy} />
      </G>
    </>
  ),

  // ── Semaine 6 · le corps qui se pose ──────────────────────────────────────
  // Spaghetti cru (raide, il tremble) / spaghetti cuit (mou, il ondule).
  'ACT-0601': () => (
    <>
      <G x={44} y={58} a="shake" t={1.2}>
        {[-8, -4, 0, 4, 8].map((x) => (
          <Line key={x} d={`M${x} -24 V24`} c={C.sun} w={2.6} />
        ))}
      </G>
      <G x={156} y={58} a="wiggle" t={2.4}>
        {[-8, -2, 4].map((x, i) => (
          <Line key={x} d={`M${x} -24 C${x + 10} -12 ${x - 10} 0 ${x} 12 S${x + 8} 22 ${x + 2} 26`} c={C.sun} w={2.6} />
        ))}
      </G>
      <G x={100} y={170} a="breathe" t={6} s={0.7}>
        <Cloud f={C.cream} />
      </G>
    </>
  ),
  // Cinq lancers, trente secondes : un chrono qui balaie et cinq points qui s'allument.
  'ACT-0602': () => (
    <>
      <G x={150} y={58}>
        <circle r={24} fill={C.cream} {...OUT} />
        <Line d="M-6 -28 H6" w={3} />
        <G a="spin" t={6}>
          <Line d="M0 0 V-17" w={2.4} />
        </G>
      </G>
      {tri(5).map((i) => (
        <G key={i} x={36 + i * 16} y={168} a="appear" d={i * 1.2} t={6.5}>
          <circle r={5} fill={C.sun} {...OUT} />
        </G>
      ))}
      <G x={44} y={110} a="toss" t={3} v={{ '--dx': '90px', '--dy': '44px', '--lift': '-36px' }}>
        <Ball r={5} />
      </G>
    </>
  ),
  // Avant le grand moment : le rideau s'ouvre sur une étoile.
  'ACT-0603': () => (
    <>
      <G x={100} y={110} a="pulse" t={3}>
        <Star r={18} />
      </G>
      <G x={28} y={100} a="curtainL" t={5}>
        <path d="M0 -72 Q30 -30 20 72 H-10 V-72Z" fill={C.navy} {...OUT} />
      </G>
      <G x={172} y={100} a="curtainR" t={5}>
        <path d="M0 -72 Q-30 -30 -20 72 H10 V-72Z" fill={C.navy} {...OUT} />
      </G>
    </>
  ),
  // La posture d'avant : les bras montent en V, le souffle dessine deux anneaux.
  'ACT-0604': () => (
    <>
      <G x={100} y={112} a="breathe" t={5} s={1.6}>
        <circle r={30} fill="none" stroke={C.cream} strokeWidth={1.4} />
      </G>
      <G x={100} y={112} a="breathe" t={5} d={1.2} s={1.2}>
        <circle r={30} fill="none" stroke={C.navy} strokeWidth={1.4} opacity={0.6} />
      </G>
      <G x={100} y={150}>
        <Person />
      </G>
      <G x={100} y={140} a="armsup" t={5} o="50% 100%">
        <Line d="M-10 -8 L-24 -28 M10 -8 L24 -28" w={3.4} c={C.navy} />
      </G>
    </>
  ),

  // ── Semaine 7 · se mesurer à soi ──────────────────────────────────────────
  // Le podium : trois marches qui montent, l'étoile au sommet.
  'ACT-0701': () => (
    <>
      {[[-30, 34, 1.1], [0, 52, 0.4], [30, 24, 1.8]].map(([x, h, d], i) => (
        <G key={i} x={100 + x} y={176} a="growy" d={d} t={5} o="50% 100%">
          <rect x={-14} y={-h} width={28} height={h} fill={i === 1 ? C.sun : C.cream} {...OUT} />
        </G>
      ))}
      <G x={100} y={108} a="appear" d={2.2} t={5}>
        <Star r={13} />
      </G>
    </>
  ),
  // Où en est ton escalier : un repère « tu es ici » qui avance, l'objectif qu'on peut décaler.
  'ACT-0702': () => (
    <>
      <G x={96} y={172}>
        <Steps n={4} lit={2} w={18} h={12} />
      </G>
      <G x={90} y={140} a="climb" t={5}>
        <Pin />
      </G>
      <G x={168} y={104} a="slide" t={4} v={{ '--dx': '-10px' }}>
        <Flag f={C.sun} />
      </G>
    </>
  ),
  // Ce que j'ai vu changer : un œil qui cligne devant deux cadres, avant et après.
  'ACT-0703': () => (
    <>
      <G x={42} y={150} r={-6}>
        <Card w={32} h={40} />
        <Line d="M-8 4 Q0 -8 8 4" w={1.8} />
      </G>
      <G x={158} y={150} r={6} a="pulse" t={4}>
        <Card w={32} h={40} f={C.sun} />
        <Line d="M-8 -2 Q0 12 8 -2" w={1.8} />
      </G>
      <G x={100} y={50} a="blink" t={4}>
        <path d="M-22 0 Q0 -16 22 0 Q0 16 -22 0Z" fill={C.cream} {...OUT} />
        <circle r={6} fill={C.navy} />
      </G>
    </>
  ),
  'ACT-0704': () => (
    <>
      <G x={60} y={132}>
        <rect x={-28} y={-34} width={56} height={68} rx={5} fill={C.cream} {...OUT} />
        <Line d="M-28 -34 V34" w={3} c={C.navy} />
      </G>
      {[0, 1, 2].map((i) => (
        <G key={i} x={64} y={108 + i * 22} a="appear" d={i * 1.1} t={5}>
          <Line d="M-16 0 H10" w={1.8} />
          <G x={16}>
            <Star r={6} />
          </G>
        </G>
      ))}
      <G x={148} y={150} a="write" t={2.4}>
        <rect x={-3} y={-28} width={6} height={30} rx={2} fill={C.sun} {...OUT} />
      </G>
    </>
  ),

  // ── Semaine 8 · demander, compter sur les autres ──────────────────────────
  // Mes trois personnes : trois silhouettes reliées à lui par un cœur qui s'allume chacun son tour.
  'ACT-0801': () => (
    <>
      {[[34, 62], [166, 62], [100, 36]].map(([x, y], i) => (
        <G key={i} x={x} y={y + 18} s={0.8}>
          <Person f={[C.sage, C.mid, C.cream][i]} />
        </G>
      ))}
      {[[58, 98], [142, 98], [100, 72]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="pulse" d={i * 1.1} t={3.6} s={0.7}>
          <Heart />
        </G>
      ))}
    </>
  ),
  // La cabane impossible : coussins, couverture, et la main levée qui demande.
  'ACT-0802': () => (
    <>
      <G x={60} y={156} a="appear" t={6}>
        <Tent />
      </G>
      <G x={60} y={150} a="drift2" t={6} d={1.2}>
        <path d="M-30 -24 Q0 -44 30 -24 L24 -14 Q0 -30 -24 -14Z" fill={C.sun} {...OUT} />
      </G>
      <G x={152} y={150}>
        <Person />
      </G>
      <G x={152} y={116} a="hand" t={3.6} o="50% 100%">
        <Line d="M-8 0 L-12 -16" w={3.4} c={C.navy} />
      </G>
      <G x={150} y={60} a="appear" t={6} d={3}>
        <Bubble w={40} h={24} tail="l" />
      </G>
    </>
  ),
  // La demande de la semaine : un « ? » qui monte, puis devient une coche.
  'ACT-0803': () => (
    <>
      <G x={100} y={44} a="appear" t={5}>
        <Bubble w={52} h={32} tail="l" />
        <text y={7} textAnchor="middle" fontSize={20} fontWeight={800} fill={C.deep}>?</text>
      </G>
      <G x={156} y={140} a="appear" t={5} d={2.6}>
        <circle r={16} fill={C.sun} {...OUT} />
        <Check />
      </G>
      <G x={44} y={150}>
        <Person />
      </G>
    </>
  ),
  // Le chapeau des talents : un chapeau dont sortent des petits cartons, l'un après l'autre.
  'ACT-0804': () => (
    <>
      {[[-14, 0], [0, 1.4], [14, 2.8]].map(([x, d], i) => (
        <G key={i} x={100 + x} y={110} a="cardup" d={d} t={4.2} r={(i - 1) * 12}>
          <Card w={22} h={30} f={i === 1 ? C.sun : C.cream} />
        </G>
      ))}
      <G x={100} y={150}>
        <ellipse rx={38} ry={8} fill={C.navy} {...OUT} />
        <path d="M-22 0 L-18 -26 H18 L22 0Z" fill={C.navy} {...OUT} />
        <rect x={-19} y={-10} width={38} height={6} fill={C.sun} />
      </G>
    </>
  ),

  // ── Semaine 9 · choisir où l'on regarde ───────────────────────────────────
  // Le projecteur : le faisceau balaie la pièce, seule la balle éclairée existe.
  'ACT-0901': () => (
    <>
      <G x={40} y={64} a="beam" t={6} o="0% 50%">
        <path d="M0 0 L150 -26 L150 26Z" fill={C.sun} opacity={0.5} />
      </G>
      <G x={40} y={64}>
        <rect x={-14} y={-8} width={22} height={16} rx={3} fill={C.cream} {...OUT} />
      </G>
      <G x={150} y={160} a="glow" t={6}>
        <circle r={13} fill={C.cream} {...OUT} />
        <Line d="M-13 0 H13" w={1.4} />
      </G>
    </>
  ),
  // Quinze secondes, ton mot : une balle en équilibre sur la cuillère, un anneau de quinze secondes.
  'ACT-0902': () => (
    <>
      <G x={62} y={150} a="balance" t={2.4} o="50% 100%">
        <Line d="M-26 12 H26" w={4} c={C.navy} />
        <G y={-4}>
          <Ball r={8} />
        </G>
      </G>
      <G x={150} y={62}>
        <circle r={24} fill="none" stroke={C.cream} strokeWidth={5} />
        <G a="spin" t={15}>
          <Line d="M0 0 V-20" w={2.6} />
          <circle cy={-22} r={3.6} fill={C.sun} />
        </G>
      </G>
      <G x={100} y={176} a="appear" t={5}>
        <rect x={-22} y={-10} width={44} height={20} rx={10} fill={C.sun} {...OUT} />
      </G>
    </>
  ),
  'ACT-0903': () => (
    <>
      <G x={100} y={170}>
        <rect x={-46} y={-18} width={92} height={8} rx={3} fill={C.navy} {...OUT} />
        <Line d="M-38 -10 V10 M38 -10 V10" w={2.6} />
      </G>
      <G x={60} y={60}>
        <rect x={-26} y={-18} width={52} height={36} rx={4} fill={C.cream} {...OUT} />
        <Line d="M-16 -4 H10 M-16 6 H4" w={1.8} />
      </G>
      <G x={152} y={90} a="appear" t={5} d={1}>
        <Bubble w={44} h={26} tail="l" />
        <G y={-1}>
          <Star r={6} />
        </G>
      </G>
    </>
  ),

  // ── Semaine 10 · visualiser ───────────────────────────────────────────────
  // Le film au ralenti : une pellicule qui défile lentement, une étincelle par image.
  'ACT-1001': () => (
    <>
      <G x={100} y={56} a="slide" t={8} v={{ '--dx': '-48px' }}>
        {[-3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${i * 48} 0)`}>
            <rect x={-20} y={-18} width={40} height={36} rx={4} fill={C.cream} {...OUT} />
            <rect x={-14} y={-10} width={28} height={20} rx={2} fill={i % 2 ? C.sage : C.pale} />
          </g>
        ))}
      </G>
      {[[62, 150], [100, 168], [140, 150]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="twinkle" d={i * 0.9} t={3.6}>
          <Star r={7} />
        </G>
      ))}
    </>
  ),
  // Vois-le, fais-le : la trajectoire se dessine en pointillé, puis la balle la suit.
  'ACT-1002': () => (
    <>
      <G x={158} y={150}>
        <Box />
      </G>
      <path d="M40 150 Q100 40 150 138" fill="none" stroke={C.deep} strokeWidth={1.8} strokeDasharray="4 5" strokeLinecap="round" opacity={0.7} />
      <G x={40} y={150} a="toss" t={5} d={1.4} v={{ '--dx': '110px', '--dy': '-12px', '--lift': '-58px' }}>
        <Ball />
      </G>
      <G x={100} y={50} a="twinkle" t={5}>
        <Star r={8} f={C.cream} />
      </G>
    </>
  ),
  // Te voir le faire bien : des bulles de pensée montent vers un soleil qui se lève.
  'ACT-1003': () => (
    <>
      <G x={100} y={172} a="sunrise" t={6}>
        <path d="M-26 0 A26 26 0 0 1 26 0Z" fill={C.sun} {...OUT} />
      </G>
      {[[52, 140, 0, 5], [70, 110, 1, 7], [50, 76, 2, 10]].map(([x, y, d, r], i) => (
        <G key={i} x={x} y={y} a="float" d={d} t={4}>
          <circle r={r} fill={C.cream} {...OUT} />
        </G>
      ))}
      <G x={150} y={70} a="float" t={5}>
        <Cloud />
      </G>
    </>
  ),
  // La carte de la fierté : la silhouette, et une chaleur qui pulse dans la poitrine.
  'ACT-1004': () => (
    <>
      <G x={100} y={110} a="pulse" t={2.6} s={1.3}>
        <circle r={20} fill={C.sun} opacity={0.45} />
      </G>
      <G x={44} y={110}>
        <path d="M-14 40 V6 Q-14 -8 0 -8 Q14 -8 14 6 V40Z" fill={C.cream} {...OUT} />
        <circle cy={-22} r={10} fill={C.cream} {...OUT} />
      </G>
      <G x={44} y={100} a="pulse" t={2.6}>
        <Heart />
      </G>
      {[[150, 60], [160, 128], [132, 168]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="appear" d={i * 1.1} t={4.5}>
          <circle r={7} fill={[C.sun, C.sage, C.cream][i]} {...OUT} />
        </G>
      ))}
    </>
  ),

  // ── Semaine 11 · la boîte à outils ────────────────────────────────────────
  // L'inventaire : un outil après l'autre tombe dans la boîte.
  'ACT-1101': () => (
    <>
      <G x={100} y={166}>
        <path d="M-34 -16 H34 L28 14 H-28Z" fill={C.sage} {...OUT} />
        <rect x={-34} y={-22} width={68} height={8} rx={3} fill={C.navy} {...OUT} />
      </G>
      <G x={76} y={60} a="drop" d={0} t={5}>
        <Balloon />
      </G>
      <G x={112} y={60} a="drop" d={1.6} t={5}>
        <Bubble w={30} h={20} />
      </G>
      <G x={140} y={60} a="drop" d={3.2} t={5}>
        <Star r={9} />
      </G>
    </>
  ),
  // La routine complète : souffle → mot → image, les trois s'allument à la suite.
  'ACT-1102': () => (
    <>
      {[[46, 0], [100, 1.6], [154, 3.2]].map(([x, d], i) => (
        <G key={i} x={x} y={56}>
          <circle r={20} fill={C.cream} {...OUT} />
          <G a="lit" d={d} t={5}>
            <circle r={20} fill={C.sun} {...OUT} />
          </G>
          <G s={0.7}>{i === 0 ? <Balloon f={C.navy} /> : i === 1 ? <Bubble w={30} h={20} f={C.navy} /> : <Star r={10} f={C.navy} />}</G>
        </G>
      ))}
      <Line d="M68 56 H78 M122 56 H132" w={2.2} dash="3 4" />
      <G x={100} y={160} a="toss" t={5} d={3.4} v={{ '--dx': '0px', '--dy': '0px', '--lift': '-24px' }}>
        <Ball />
      </G>
      <G x={100} y={176}>
        <Box w={40} h={16} />
      </G>
    </>
  ),
  // Où ailleurs : une carte, et des épingles qui se posent aux quatre coins de sa vie.
  'ACT-1103': () => (
    <>
      <G x={100} y={110}>
        <path d="M-70 -30 L-24 -44 L24 -30 L70 -44 V40 L24 54 L-24 40 L-70 54Z" fill={C.cream} opacity={0.55} {...OUT} />
      </G>
      {[[46, 100, 0], [100, 78, 1.2], [148, 112, 2.4], [84, 140, 3.6]].map(([x, y, d], i) => (
        <G key={i} x={x} y={y} a="pinpop" d={d} t={6}>
          <Pin f={i === 2 ? C.cream : C.sun} />
        </G>
      ))}
    </>
  ),
  // Le tirage du matin : la carte du dessus se retourne et révèle l'outil du jour.
  'ACT-1104': () => (
    <>
      {[0, 1, 2].map((i) => (
        <G key={i} x={152 - i * 3} y={150 - i * 3}>
          <Card w={34} h={46} f={i === 2 ? C.navy : C.cream} />
        </G>
      ))}
      <G x={146} y={144} a="flip" t={4}>
        <Card w={34} h={46} f={C.sun} />
        <G>
          <Star r={10} f={C.cream} />
        </G>
      </G>
      <G x={48} y={150} a="sunrise" t={6} s={0.8}>
        <path d="M-26 0 A26 26 0 0 1 26 0Z" fill={C.sun} {...OUT} />
      </G>
    </>
  ),
  // Et si… ? : un chemin qui se sépare en trois, un point qui les essaie tour à tour.
  'ACT-1105': () => (
    <>
      <Line d="M100 176 V132 M100 132 Q100 100 52 76 M100 132 V70 M100 132 Q100 100 148 76" w={2.4} />
      {[[52, 70], [100, 62], [148, 70]].map(([x, y], i) => (
        <G key={i} x={x} y={y} a="lit" d={i * 1.6} t={5}>
          <circle r={9} fill={C.sun} {...OUT} />
        </G>
      ))}
      <G x={152} y={150} a="pulse" t={2.4}>
        <text textAnchor="middle" fontSize={26} fontWeight={800} fill={C.deep}>?</text>
      </G>
    </>
  ),

  // ── Semaine 12 · contribuer, transmettre ──────────────────────────────────
  // La mission secrète : un mot plié glisse sous la porte, personne ne le voit.
  'ACT-1201': () => (
    <>
      <G x={100} y={130}>
        <rect x={-26} y={-44} width={52} height={88} rx={4} fill={C.navy} {...OUT} />
        <circle cx={14} cy={2} r={3} fill={C.sun} />
      </G>
      <G x={100} y={176} a="slide2" t={5}>
        <Env />
      </G>
      <G x={156} y={56} a="twinkle" t={2.4}>
        <Star r={8} />
      </G>
      <G x={44} y={60} a="blink" t={5}>
        <path d="M-14 0 Q0 -10 14 0" fill="none" stroke={C.deep} strokeWidth={2} strokeLinecap="round" />
      </G>
    </>
  ),
  // Prof d'un jour : le tableau se remplit à la craie, la baguette le désigne.
  'ACT-1202': () => (
    <>
      <G x={100} y={82}>
        <rect x={-58} y={-34} width={116} height={68} rx={6} fill={C.navy} {...OUT} />
      </G>
      <path d="M58 70 Q76 62 92 70 T124 66" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round" pathLength={1} className="sc sc-draw" style={{ '--t': '5s' } as CSSProperties} />
      <G x={132} y={120} a="sway" t={3} o="0% 100%">
        <Line d="M0 0 L-40 -34" w={3} c={C.sun} />
      </G>
      <G x={44} y={160} a="bob" t={2.4}>
        <circle r={10} fill={C.sun} {...OUT} />
        <path d="M0 -10 Q4 -16 8 -12" fill="none" stroke={C.deep} strokeWidth={1.6} />
      </G>
    </>
  ),
  // Qui d'autre en a besoin ? : l'outil, une petite boule de lumière, passe d'un à l'autre.
  'ACT-1203': () => (
    <>
      <G x={44} y={150}>
        <Person />
      </G>
      <G x={156} y={150}>
        <Person f={C.mid} />
      </G>
      <G x={44} y={112} a="toss" t={4} v={{ '--dx': '112px', '--dy': '0px', '--lift': '-40px' }}>
        <circle r={7} fill={C.sun} {...OUT} />
      </G>
      <G x={100} y={50} a="twinkle" t={3}>
        <Star r={9} />
      </G>
    </>
  ),
  'ACT-1204': () => (
    <>
      <G x={60} y={110}>
        <rect x={-30} y={-42} width={60} height={84} rx={6} fill={C.cream} {...OUT} />
        <rect x={-10} y={-48} width={20} height={10} rx={3} fill={C.navy} {...OUT} />
      </G>
      {[0, 1, 2].map((i) => (
        <G key={i} x={44} y={90 + i * 22}>
          <rect x={-8} y={-7} width={14} height={14} rx={3} fill="none" stroke={C.deep} strokeWidth={1.6} />
          <G a="appear" d={i * 1.3} t={5} x={-1}>
            <Check c={C.navy} />
          </G>
          <Line d="M14 0 H34" w={1.8} />
        </G>
      ))}
      <G x={152} y={130} a="pulse" t={3}>
        <circle r={18} fill={C.sun} {...OUT} />
        <Star r={9} f={C.deep} />
      </G>
    </>
  ),

  // ── Semaine 13 · bilan et fête ────────────────────────────────────────────
  // Ce que j'ai vu : trois rubans-preuves qui se posent, une force chacun.
  'ACT-1301': () => (
    <>
      {[[46, 0], [100, 1.4], [154, 2.8]].map(([x, d], i) => (
        <G key={i} x={x} y={56} a="appear" d={d} t={5}>
          <circle r={16} fill={i === 1 ? C.sun : C.cream} {...OUT} />
          <Star r={7} f={C.deep} />
          <path d="M-8 14 L-12 34 L0 28 L12 34 L8 14" fill={C.navy} {...OUT} />
        </G>
      ))}
      <G x={100} y={160} a="float" t={4}>
        <Env />
      </G>
    </>
  ),
  // La lettre à ouvrir dans un an : l'enveloppe scellée, et les pages du calendrier qui s'envolent.
  'ACT-1302': () => (
    <>
      <G x={100} y={120} a="float" t={4}>
        <Env />
        <circle cy={-1} r={6} fill={C.sun} {...OUT} />
      </G>
      {[[46, 0], [158, 1.5], [60, 3], [148, 4.2]].map(([x, d], i) => (
        <G key={i} x={x} y={150} a="leaf" d={d} t={6}>
          <rect x={-9} y={-11} width={18} height={22} rx={3} fill={C.cream} {...OUT} />
          <rect x={-9} y={-11} width={18} height={6} rx={2} fill={C.navy} />
        </G>
      ))}
    </>
  ),
  // Ce que tu gardes : des confettis de marque qui tombent, l'étoile au centre.
  'ACT-1303': () => (
    <>
      {[[30, 0], [58, 1.1], [86, 0.5], [114, 1.7], [142, 0.3], [170, 1.3], [44, 2.4], [128, 2.1], [156, 2.8]].map(([x, d], i) => (
        <G key={i} x={x} y={30} a="confetti" d={d} t={4.6} r={i * 25}>
          <Conf f={[C.sun, C.cream, C.sage, C.navy][i % 4]} />
        </G>
      ))}
      <G x={100} y={168} a="pulse" t={3}>
        <Star r={14} />
      </G>
    </>
  ),

  // ── Bonus ─────────────────────────────────────────────────────────────────
  // Le blason : les quatre cases se remplissent, l'une après l'autre.
  'BON-01': () => (
    <>
      <G x={100} y={108}>
        <path d="M-34 -42 H34 V6 Q34 34 0 48 Q-34 34 -34 6Z" fill={C.cream} {...OUT} />
        <Line d="M0 -42 V46 M-34 0 H34" w={1.6} />
      </G>
      {[[-17, -21, 0], [17, -21, 1.3], [-17, 13, 2.6], [17, 13, 3.9]].map(([x, y, d], i) => (
        <G key={i} x={100 + x} y={108 + y} a="appear" d={d} t={6}>
          {i === 0 ? <Heart /> : i === 1 ? <Star r={9} /> : i === 2 ? <circle r={8} fill={C.sun} {...OUT} /> : <rect x={-9} y={-5} width={18} height={10} rx={3} fill={C.sage} {...OUT} />}
        </G>
      ))}
    </>
  ),
};

/** Scène de secours : quelques étoiles, si une activité n'a pas encore sa scène. */
function Fallback() {
  return (
    <>
      {[[46, 60, 0], [154, 70, 0.8], [100, 38, 1.6]].map(([x, y, d], i) => (
        <G key={i} x={x} y={y} a="twinkle" d={d} t={3}>
          <Star r={10} />
        </G>
      ))}
    </>
  );
}

/** Les identifiants qui ont une scène dessinée. */
export const SCENE_IDS = Object.keys(SCENES);

/** `bare` : sans disque de fond, pour poser la scène par-dessus une illustration sombre. */
export function ActivityScene({ id, className = '', bare = false }: { id: string; className?: string; bare?: boolean }) {
  const scene = SCENES[id];
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className} data-scene={id} style={bare ? undefined : { clipPath: 'circle(50%)' }}>
      {!bare && (
        <>
          <circle cx={100} cy={100} r={100} fill={C.sageL} />
          <circle cx={100} cy={100} r={84} fill={C.cream} opacity={0.35} />
        </>
      )}
      {scene ? scene() : <Fallback />}
    </svg>
  );
}
