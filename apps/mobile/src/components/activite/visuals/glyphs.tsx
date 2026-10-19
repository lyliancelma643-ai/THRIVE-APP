import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { Icon, useTheme } from '../../../design';
import type { VisualId } from '../../../lib/p3';
import { CheckinGlyph } from '../Glyph';
import { LIST_ICON, TOOL_ICON, VISUAL_ICON } from './iconMap';

// Pictogrammes des supports visuels, dessinés en SVG (jamais d'emoji). Les visages complètent ceux du check-in (M1) avec le
// même trait ; les autres pictogrammes viennent du jeu d'icônes de l'app. Décoratifs : le libellé porté par la case est lu
// par VoiceOver. Palette d'illustration = celle de la marque (comme Glyph.tsx).
const FACE = { sky: '#9CC3DB', fog: '#7FA6C2', sage: '#A7C4BC', cloud: '#C9DCD6' } as const;

/** Visages propres aux visuels (peur, colère, fierté) ; joie, frustration et nervosité réutilisent ceux du check-in. */
function ExtraFace({ id, size }: { id: 'peur' | 'colere' | 'fierte'; size: number }) {
  const { colors } = useTheme();
  const D = colors.navy900;
  const K = colors.cream;
  const st = { stroke: D, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  const face = (fill: string, kids: ReactNode) => (
    <>
      <Circle cx={24} cy={24} r={21} fill={fill} stroke={D} strokeWidth={2.2} />
      {kids}
    </>
  );
  const pupils = (y: number) => (
    <>
      <Circle cx={16.5} cy={y} r={2.4} fill={D} />
      <Circle cx={31.5} cy={y} r={2.4} fill={D} />
    </>
  );
  let kids: ReactNode;
  if (id === 'peur') {
    kids = face(FACE.sky, (
      <>
        <Circle cx={16.5} cy={20} r={4} fill={K} stroke={D} strokeWidth={1.8} />
        <Circle cx={31.5} cy={20} r={4} fill={K} stroke={D} strokeWidth={1.8} />
        <Circle cx={16.5} cy={20.5} r={1.7} fill={D} />
        <Circle cx={31.5} cy={20.5} r={1.7} fill={D} />
        <Ellipse cx={24} cy={33} rx={4} ry={5} fill={D} />
      </>
    ));
  } else if (id === 'colere') {
    kids = face(FACE.fog, (
      <>
        <Path d="M12 14 L21 19 M36 14 L27 19" {...st} strokeWidth={2.6} />
        {pupils(22)}
        <Path d="M16 35 Q24 28 32 35" {...st} />
      </>
    ));
  } else {
    kids = face(FACE.sage, (
      <>
        <Path d="M13 21 Q16.5 17 20 21 M28 21 Q31.5 17 35 21" {...st} />
        <Path d="M15 29 Q24 37 33 29" {...st} />
        <Path d="M33 9 l1.5 3 3 .4-2.2 2.1.6 3-2.9-1.5-2.9 1.5.6-3-2.2-2.1 3-.4z" fill={K} stroke={D} strokeWidth={1.2} />
      </>
    ));
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {kids}
    </Svg>
  );
}

/** Visage d'une des six émotions (VI1). */
export function EmotionFace({ id, size }: { id: string; size: number }) {
  if (id === 'peur' || id === 'colere' || id === 'fierte') return <ExtraFace id={id} size={size} />;
  return <CheckinGlyph id={id} size={size} />;
}

/** Pictogramme du bouton « Montrer : … » (MV). */
export function VisualIcon({ id, size = 22, color }: { id: VisualId; size?: number; color?: string }) {
  return <Icon name={VISUAL_ICON[id]} size={size} color={color} />;
}

export function ToolIcon({ id, size = 18, color }: { id: string; size?: number; color?: string }) {
  return <Icon name={TOOL_ICON[id] ?? 'sparkles'} size={size} color={color} />;
}

export function ListIcon({ id, size = 24, color }: { id: string; size?: number; color?: string }) {
  return <Icon name={LIST_ICON[id] ?? 'sparkles'} size={size} color={color} />;
}

/** Nuage et pluie : « Ça ne dépend pas de moi » (VI3). */
export function CloudRain({ size = 34 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M14 34h21a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 0 13z" fill={FACE.cloud} stroke={colors.navy900} strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M18 39l-2 4M25 39l-2 4M32 39l-2 4" stroke={FACE.sky} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
