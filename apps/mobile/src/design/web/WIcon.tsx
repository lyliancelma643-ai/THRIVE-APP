import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Jeu d'icônes du web (apps/web/src/components/ui/Icon.tsx), copié tel quel : grille 24, trait 1,9, arrondi.
 * Les écrans portés du web l'utilisent pour garder exactement le même dessin.
 */
type Shape =
  | { p: string; fill?: true }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number]; fill?: true };

const P = (d: string): Shape => ({ p: d });
const C = (cx: number, cy: number, r: number): Shape => ({ c: [cx, cy, r] });
const R = (x: number, y: number, w: number, h: number, rx: number, fill?: true): Shape => ({ r: [x, y, w, h, rx], fill });

const ICONS = {
  compass: [C(12, 12, 9), P('m15.5 8.5-2 5-5 2 2-5z')],
  user: [C(12, 8, 4), P('M4 21a8 8 0 0 1 16 0')],
  target: [C(12, 12, 9), C(12, 12, 5), C(12, 12, 1)],
  users: [C(9, 8, 3.5), P('M3 21a6 6 0 0 1 12 0'), P('M16 5.5a3.5 3.5 0 0 1 0 7M18 21a6 6 0 0 0-3-5.2')],
  child: [C(12, 8, 4), P('M9 8h.01M15 8h.01M9.5 11a3 3 0 0 0 5 0'), P('M5 21a7 7 0 0 1 14 0')],
  trophy: [P('M8 4h8v5a4 4 0 0 1-8 0z'), P('M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3'), P('M12 13v4M9 21h6M10 21v-2h4v2')],
  clipboard: [R(6, 4, 12, 17, 2), P('M9 4a3 3 0 0 1 6 0M9 10h6M9 14h6M9 18h3')],
  message: [P('M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z')],
  bell: [P('M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6'), P('M10.5 20a2 2 0 0 0 3 0')],
  chart: [P('M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-9M20 20v-4')],
  lock: [R(5, 10, 14, 10, 2), P('M8 10V7a4 4 0 0 1 8 0v3')],
  'arrow-right': [P('M4 12h15M13 6l6 6-6 6')],
  plus: [P('M12 5v14M5 12h14')],
  check: [P('m5 12 5 5L20 7')],
  flag: [P('M5 21V4m0 1h12l-2.5 4L17 13H5')],
  sparkle: [P('M12 3c.5 3.8 1.7 5 5.5 5.5-3.8.5-5 1.7-5.5 5.5-.5-3.8-1.7-5-5.5-5.5C10.3 8 11.5 6.8 12 3Z')],
  timer: [C(12, 13.5, 7), P('M12 9.5v4l2.5 1.5M9.5 3.5h5')],
  eye: [P('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z'), C(12, 12, 2.8)],
  book: [P('M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z'), P('M8 17h10')],
  star: [P('M12 3.5l2.6 5.35 5.9.86-4.27 4.16 1.01 5.88L12 17.02l-5.25 2.79 1.01-5.88L3.5 9.71l5.9-.86z')],
  grid: [R(4, 4, 7, 7, 1.6), R(13, 4, 7, 7, 1.6), R(4, 13, 7, 7, 1.6), R(13, 13, 7, 7, 1.6)],
  home: [P('M4 11.5 12 4l8 7.5'), P('M6 10.2V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-8.8'), P('M10 20v-5h4v5')],
  mail: [R(3, 5, 18, 14, 2), P('m3.5 7 8.5 6 8.5-6')],
  settings: [
    C(12, 12, 3),
    P(
      'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1A1.9 1.9 0 1 1 6.9 4.6l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z',
    ),
  ],
  power: [P('M12 4v8'), P('M7.6 7.1a7 7 0 1 0 8.8 0')],
  'chevron-down': [P('m6 9 6 6 6-6')],
  'chevron-up': [P('m6 15 6-6 6 6')],
  'chevron-right': [P('m9 6 6 6-6 6')],
  'chevron-left': [P('m15 18-6-6 6-6')],
  play: [{ p: 'M8 5.5v13l11-6.5z', fill: true }],
  download: [P('M12 4v11m0 0-4-4m4 4 4-4M5 20h14')],
  close: [P('M6 6l12 12M18 6 6 18')],
  calendar: [R(4, 5.5, 16, 14.5, 2.5), P('M4 10h16M8.5 3.5v4M15.5 3.5v4')],
  video: [R(3.5, 6.5, 12, 11, 2.5), P('m15.5 10.5 5-3v9l-5-3')],
  refresh: [P('M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4')],
  shield: [P('M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z'), P('m9 12 2 2 4-4')],
  /** Bascule d'ambiance (AmbianceToggle.tsx) : le soleil (en Nuit) et la lune (en Jour). */
  sun: [C(12, 12, 4.2), P('M12 3.2v1.6M12 19.2v1.6M3.2 12h1.6M19.2 12h1.6M5.8 5.8l1.1 1.1M17.1 17.1l1.1 1.1M18.2 5.8l-1.1 1.1M6.9 17.1l-1.1 1.1')],
  moon: [P('M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z')],
} satisfies Record<string, Shape[]>;

export type WIconName = keyof typeof ICONS;

export type WIconProps = {
  name: WIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** `fill="currentColor"` du web (étoile pleine, etc.). */
  filled?: boolean;
};

/** Icône du web : décorative (le bouton parent porte le libellé). */
export function WIcon({ name, size = 20, color, strokeWidth = 1.9, filled = false }: WIconProps) {
  const hide =
    Platform.OS === 'web'
      ? ({ 'aria-hidden': true } as object)
      : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...hide}
    >
      {ICONS[name].map((s, i) => {
        if ('p' in s) return <Path key={i} d={s.p} fill={s.fill || filled ? color : 'none'} />;
        if ('c' in s) return <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} fill={filled ? color : 'none'} />;
        return <Rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} fill={s.fill ? color : 'none'} />;
      })}
    </Svg>
  );
}
