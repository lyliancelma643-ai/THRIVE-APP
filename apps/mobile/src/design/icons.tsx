import { Circle, Path, Rect, Svg } from 'react-native-svg';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';

/**
 * Icônes du canevas Claude Design (grille 24, trait 1,85, arrondis). Chemins extraits tels quels des
 * écrans `docs/design/claude-design-ios27/project/*.dc.html`. Couleur = prop `color` (défaut `label`).
 * `sw` = épaisseur de trait par défaut ; `fill`/`noStroke` reproduisent les formes pleines (lecture, pause, guillemets).
 */
type Shape =
  | { t: 'path'; d: string; fill?: 1; noStroke?: 1 }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill?: 1; noStroke?: 1 }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: 1; noStroke?: 1 };

type IconDef = { sw?: number; els: Shape[] };

const ICON_DEFS = {
  check: { sw: 2.4, els: [
      { t: 'path', d: 'M5 12.5l4.5 4.5L19 7' },
  ] },
  chevronRight: { sw: 2.4, els: [
      { t: 'path', d: 'M9.5 5.5l6.5 6.5-6.5 6.5' },
  ] },
  chevronLeft: { sw: 1.85, els: [
      { t: 'path', d: 'M15 5l-7 7 7 7' },
  ] },
  close: { els: [
      { t: 'path', d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
  ] },
  lock: { els: [
      { t: 'rect', x: 5, y: 10.5, w: 14, h: 10, rx: 2.6 },
      { t: 'path', d: 'M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5' },
  ] },
  sparkles: { els: [
      { t: 'path', d: 'M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4-5.4-1.9 5.4-1.9z' },
      { t: 'path', d: 'M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z' },
  ] },
  calendar: { els: [
      { t: 'rect', x: 4, y: 5.5, w: 16, h: 15, rx: 2.8 },
      { t: 'path', d: 'M4 10h16M8.3 3.5v3.5M15.7 3.5v3.5' },
  ] },
  home: { els: [
      { t: 'path', d: 'M4 11.2l8-7 8 7V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19z' },
  ] },
  chevronDown: { sw: 2.4, els: [
      { t: 'path', d: 'M6.5 9.5l5.5 5.5 5.5-5.5' },
  ] },
  bell: { els: [
      { t: 'path', d: 'M6 16.5v-5.3a6 6 0 0 1 12 0v5.3l1.6 1.9H4.4zM10 20.5a2.1 2.1 0 0 0 4 0' },
  ] },
  pulse: { els: [
      { t: 'path', d: 'M3 12.5c2 0 2.2-5.5 4.6-5.5S10 17.5 12.4 17.5 15 7 17.4 7s2 5.5 3.6 5.5' },
  ] },
  play: { els: [
      { t: 'path', d: 'M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.6-6.8c.6-.4.6-1.3 0-1.7L9.6 4.3C8.9 3.9 8 4.4 8 5.2z', fill: 1, noStroke: 1 },
  ] },
  share: { els: [
      { t: 'path', d: 'M12 14.5V3.5M8 7.3l4-3.8 4 3.8M7 10.5H6a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18 10.5h-1' },
  ] },
  chat: { els: [
      { t: 'path', d: 'M4 11.8C4 7.5 7.6 4.5 12 4.5s8 3 8 7.3-3.6 7.3-8 7.3c-1.2 0-2.3-.2-3.3-.6L4.6 20l1.1-3.5C4.6 15.2 4 13.6 4 11.8z' },
  ] },
  info: { els: [
      { t: 'circle', cx: 12, cy: 12, r: 8.5 },
      { t: 'path', d: 'M12 11v5.5M12 7.6v.2' },
  ] },
  timer: { els: [
      { t: 'circle', cx: 12, cy: 13.2, r: 7.4 },
      { t: 'path', d: 'M12 13.2V9.4M9.8 3.4h4.4' },
  ] },
  people: { els: [
      { t: 'circle', cx: 9, cy: 8.5, r: 3.2 },
      { t: 'path', d: 'M3.2 19.5c.8-3.2 3.1-5 5.8-5s5 1.8 5.8 5' },
      { t: 'circle', cx: 16.6, cy: 9.2, r: 2.6 },
      { t: 'path', d: 'M16.2 14.6c2.3 0 4 1.6 4.6 4.4' },
  ] },
  gift: { els: [
      { t: 'rect', x: 4, y: 9, w: 16, h: 4, rx: 1.2 },
      { t: 'path', d: 'M5.5 13v6.5h13V13M12 9v10.5M12 9c-1.2-2.6-4.6-3.7-5-1.6-.3 1.5 2.4 1.6 5 1.6zM12 9c1.2-2.6 4.6-3.7 5-1.6.3 1.5-2.4 1.6-5 1.6z' },
  ] },
  document: { els: [
      { t: 'path', d: 'M7 3.5h6.8l4.2 4.2V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z' },
      { t: 'path', d: 'M13.5 3.7V8h4.3M8.5 12.5h7M8.5 16h5' },
  ] },
  more: { els: [
      { t: 'circle', cx: 6, cy: 12, r: 1.6, fill: 1, noStroke: 1 },
      { t: 'circle', cx: 12, cy: 12, r: 1.6, fill: 1, noStroke: 1 },
      { t: 'circle', cx: 18, cy: 12, r: 1.6, fill: 1, noStroke: 1 },
  ] },
  search: { els: [
      { t: 'circle', cx: 10.8, cy: 10.8, r: 6.3 },
      { t: 'path', d: 'M15.5 15.5l4.8 4.8' },
  ] },
  tray: { els: [
      { t: 'path', d: 'M4 13.5l2.4-7.3c.2-.6.8-1 1.4-1h8.4c.6 0 1.2.4 1.4 1l2.4 7.3v5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5zM4 13.5h4.8l1.2 2h4l1.2-2H20' },
  ] },
  shieldCheck: { els: [
      { t: 'path', d: 'M12 3.5l7 2.6v5.2c0 4.6-3 8-7 9.2-4-1.2-7-4.6-7-9.2V6.1z' },
      { t: 'path', d: 'M9 12l2.2 2.2L15.2 10' },
  ] },
  chevronUpDown: { els: [
      { t: 'path', d: 'M8 9.5l4-4 4 4M8 14.5l4 4 4-4' },
  ] },
  star: { els: [
      { t: 'path', d: 'M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z' },
  ] },
  pencil: { els: [
      { t: 'path', d: 'M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5zM14 6.8l3.2 3.2' },
  ] },
  grid: { els: [
      { t: 'rect', x: 4, y: 4, w: 7, h: 7, rx: 2 },
      { t: 'rect', x: 13, y: 4, w: 7, h: 7, rx: 2 },
      { t: 'rect', x: 4, y: 13, w: 7, h: 7, rx: 2 },
      { t: 'rect', x: 13, y: 13, w: 7, h: 7, rx: 2 },
  ] },
  video: { els: [
      { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 3.2 },
      { t: 'path', d: 'M10.2 9.2v5.6l4.8-2.8z', fill: 1 },
  ] },
  pause: { els: [
      { t: 'rect', x: 6.5, y: 5, w: 3.6, h: 14, rx: 1.2, fill: 1, noStroke: 1 },
      { t: 'rect', x: 13.9, y: 5, w: 3.6, h: 14, rx: 1.2, fill: 1, noStroke: 1 },
  ] },
  mail: { els: [
      { t: 'rect', x: 3.5, y: 5.5, w: 17, h: 13, rx: 2.6 },
      { t: 'path', d: 'M4.5 7l7.5 6 7.5-6' },
  ] },
  moon: { els: [
      { t: 'path', d: 'M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.6 7.6 0 1 0 9.8 9.8z' },
  ] },
  idCard: { els: [
      { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 3.2 },
      { t: 'circle', cx: 9, cy: 10.6, r: 2.2 },
      { t: 'path', d: 'M5.8 16.2c.7-1.5 1.8-2.2 3.2-2.2s2.5.7 3.2 2.2M14.5 10h4M14.5 13.5h3' },
  ] },
  plus: { els: [
      { t: 'path', d: 'M12 5v14M5 12h14' },
  ] },
  phone: { els: [
      { t: 'rect', x: 6.5, y: 2.8, w: 11, h: 18.4, rx: 2.8 },
      { t: 'path', d: 'M10.5 5.3h3' },
  ] },
  faceId: { els: [
      { t: 'path', d: 'M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2M9 9v1.5M15 9v1.5M12 9v4h-1M9.3 15.6c1.6 1.3 3.8 1.3 5.4 0' },
  ] },
  target: { els: [
      { t: 'circle', cx: 12, cy: 12, r: 8.4 },
      { t: 'circle', cx: 12, cy: 12, r: 4.8 },
      { t: 'circle', cx: 12, cy: 12, r: 1.4, fill: 1 },
  ] },
  toolbox: { els: [
      { t: 'rect', x: 3.5, y: 8, w: 17, h: 11.5, rx: 2.6 },
      { t: 'path', d: 'M9 8V6.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V8M3.5 13h17M10.5 13v2M13.5 13v2' },
  ] },
  camera: { els: [
      { t: 'path', d: 'M4 8.6A1.6 1.6 0 0 1 5.6 7h2.2l1.5-2.1h5.4L16.2 7h2.2A1.6 1.6 0 0 1 20 8.6v9a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6z' },
      { t: 'circle', cx: 12, cy: 12.8, r: 3.3 },
  ] },
  runner: { els: [
      { t: 'circle', cx: 13, cy: 4.8, r: 1.9 },
      { t: 'path', d: 'M8 21l2.6-6.2 2.7 2.4V21M10.6 14.8l1.2-5.3-3.5 1.4L7 13.5M11.8 9.5l3.4 2.6 2.8.4' },
  ] },
  compass: { els: [
      { t: 'circle', cx: 12, cy: 12, r: 8.5 },
      { t: 'path', d: 'M15.5 8.5l-2 5-5 2 2-5z' },
  ] },
  book: { els: [
      { t: 'path', d: 'M12 6.5c-1.8-1.3-4.3-2-7.5-2v13c3.2 0 5.7.7 7.5 2 1.8-1.3 4.3-2 7.5-2v-13c-3.2 0-5.7.7-7.5 2zM12 6.5v13' },
  ] },
  arrowRight: { els: [
      { t: 'path', d: 'M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5' },
  ] },
  person: { els: [
      { t: 'circle', cx: 12, cy: 8.2, r: 3.6 },
      { t: 'path', d: 'M5 20c.9-3.6 3.7-5.6 7-5.6s6.1 2 7 5.6' },
  ] },
  quote: { els: [
      { t: 'path', d: 'M10 7.5C7.2 8.3 5.5 10.4 5.5 13.5V17h4.6v-4.6H7.6c0-1.8.9-2.9 2.4-3.4zM18.5 7.5c-2.8.8-4.5 2.9-4.5 6V17h4.6v-4.6h-2.5c0-1.8.9-2.9 2.4-3.4z', fill: 1, noStroke: 1 },
  ] },
  copy: { els: [
      { t: 'rect', x: 8.5, y: 8.5, w: 11.5, h: 11.5, rx: 2.4 },
      { t: 'path', d: 'M15.5 8.5V6A2 2 0 0 0 13.5 4h-7.5A2 2 0 0 0 4 6v7.5a2 2 0 0 0 2 2h2.5' },
  ] },
  leaf: { els: [
      { t: 'path', d: 'M5 19c0-8 5-13.5 14-14-.5 9-6 14-14 14zM5 19l7-7' },
  ] },
  hand: { els: [
      { t: 'path', d: 'M8 12.5V6.2a1.4 1.4 0 0 1 2.8 0V11M10.8 10.5V4.8a1.4 1.4 0 0 1 2.8 0v5.7M13.6 10.5V6a1.4 1.4 0 0 1 2.8 0v6.3M16.4 10.8V9a1.4 1.4 0 0 1 2.8 0v4.5c0 4-2.7 7-6.7 7-2.9 0-4.6-1.4-6-3.8L4.6 13.2a1.4 1.4 0 0 1 2.3-1.5L8 13.2' },
  ] },
  medal: { els: [
      { t: 'circle', cx: 12, cy: 14.5, r: 5.5 },
      { t: 'path', d: 'M8.5 3.5l3.5 5.5 3.5-5.5M12 12v5M10.5 13.2L12 12' },
  ] },
  key: { els: [
      { t: 'circle', cx: 8, cy: 15.5, r: 4 },
      { t: 'path', d: 'M11 12.6L19.5 4M16.5 7l2.2 2.2M14.3 9.2l1.8 1.8' },
  ] },
  arrowUp: { els: [
      { t: 'path', d: 'M12 19V5.5M6.5 11L12 5.5 17.5 11' },
  ] },
  eye: { els: [
      { t: 'path', d: 'M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z' },
      { t: 'circle', cx: 12, cy: 12, r: 3 },
  ] },
  settings: { els: [
      { t: 'circle', cx: 12, cy: 12, r: 3 },
      { t: 'path', d: 'M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6' },
  ] },
  restore: { els: [
      { t: 'path', d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4' },
  ] },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICON_DEFS;
export const ICON_NAMES = Object.keys(ICON_DEFS) as IconName[];
export const DEFAULT_STROKE = 1.85;

export type IconProps = {
  name: IconName;
  size?: number;
  /** Couleur résolue (ex. `colors.tint`). Défaut : `colors.label`. */
  color?: string;
  /** Épaisseur du trait (grille 24). Défaut : celle de l'icône du canevas (1,85 en général). */
  strokeWidth?: number;
  /** Forme pleine (étoile, etc.) : remplit avec `color`, sans trait. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Icône SVG au trait du canevas. Décorative : masquée à VoiceOver (le bouton parent porte le libellé). */
export function Icon({ name, size = 24, color, strokeWidth, filled, style }: IconProps) {
  const { colors } = useTheme();
  const ink = color ?? colors.label;
  const def: IconDef = ICON_DEFS[name];
  const sw = strokeWidth ?? def.sw ?? DEFAULT_STROKE;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ink}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      {...(Platform.OS === 'web' ? ({ 'aria-hidden': true } as object) : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}
    >
      {def.els.map((s, i) => {
        const solid = s.fill || filled;
        const common = {
          fill: solid ? ink : 'none',
          stroke: s.noStroke || filled ? 'none' : ink,
        };
        if (s.t === 'path') return <Path key={i} d={s.d} {...common} />;
        if (s.t === 'rect') return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...common} />;
        return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />;
      })}
    </Svg>
  );
}
