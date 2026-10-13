import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../design';

// Pictogrammes du check-in, dessinés en SVG (jamais d'emoji comme icône d'interface). Portage de Glyph.tsx (web) pour
// les neuf choix de CHECKIN ; l'identifiant est celui de l'option (joie, calme, nervosite…), pas l'emoji.
// Les teintes de visage sont celles de l'illustration du canevas (palette de marque : sauge claire, bleus).
const ILLUSTRATION = { sageLight: '#C9DCD6', sky: '#67A4C9', mid: '#3380AC' } as const;

type Ink = { D: string; K: string; S: string };

function glyphs({ D, K, S }: Ink): Record<string, ReactNode> {
  const st = { stroke: D, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  const face = (f: string, kids: ReactNode) => (
    <>
      <Circle cx={24} cy={24} r={21} fill={f} stroke={D} strokeWidth={2.2} />
      {kids}
    </>
  );
  const eyes = (y = 20) => (
    <>
      <Circle cx={16.5} cy={y} r={2.4} fill={D} />
      <Circle cx={31.5} cy={y} r={2.4} fill={D} />
    </>
  );
  return {
    joie: face(S, (
      <>
        <Path d="M14 19 Q16.5 15.5 19 19 M29 19 Q31.5 15.5 34 19" {...st} />
        <Path d="M13 28 Q24 40 35 28Z" fill={D} stroke={D} strokeWidth={1.6} strokeLinejoin="round" />
      </>
    )),
    calme: face(K, <>{eyes(20)}<Path d="M16 31 Q24 37 32 31" {...st} /></>),
    nervosite: face(ILLUSTRATION.sageLight, (
      <>
        {eyes(19)}
        <Rect x={13} y={28} width={22} height={9} rx={3} fill={K} stroke={D} strokeWidth={2} />
        <Path d="M20.5 28 V37 M27.5 28 V37 M13 32.5 H35" stroke={D} strokeWidth={1.6} />
      </>
    )),
    frustration: face(ILLUSTRATION.sky, (
      <>
        <Path d="M12 16 L21 19 M36 16 L27 19" {...st} />
        {eyes(22)}
        <Path d="M17 33 H31" {...st} />
        <Path d="M9 30 Q5 28 6 24 M39 30 Q43 28 42 24" {...st} strokeWidth={1.8} />
      </>
    )),
    tristesse: face(ILLUSTRATION.sageLight, (
      <>
        <Path d="M12 16 L20 13 M36 16 L28 13" {...st} strokeWidth={1.8} />
        {eyes(22)}
        <Path d="M17 35 Q24 29 31 35" {...st} />
      </>
    )),
    fatigue: face(ILLUSTRATION.sageLight, (
      <>
        <Path d="M13 21 H20 M28 21 H35" {...st} />
        <Path d="M18 33 Q24 36 30 33" {...st} />
        <Path d="M36 6 H43 L36 13 H43" {...st} strokeWidth={1.8} />
      </>
    )),
    energie: <Path d="M27 3 L9 27 H22 L19 45 L39 18 H25Z" fill={S} stroke={D} strokeWidth={2.2} strokeLinejoin="round" />,
    pleine: <Path d="M6 10 H42 M10 18 H38 M15 26 H34 M19 34 H30 M23 42 H27" {...st} strokeWidth={3.4} stroke={ILLUSTRATION.mid} />,
    libre: (
      <>
        <Circle cx={24} cy={24} r={9} fill={S} stroke={D} strokeWidth={2.2} />
        <Path d="M24 5 V10 M24 38 V43 M5 24 H10 M38 24 H43 M10.5 10.5 L14 14 M34 34 L37.5 37.5 M10.5 37.5 L14 34 M34 14 L37.5 10.5" {...st} />
      </>
    ),
  };
}

/** Pictogramme d'une option de check-in. Décoratif : le libellé de la pastille est lu par VoiceOver. */
export function CheckinGlyph({ id, size = 30 }: { id: string; size?: number }) {
  const { colors } = useTheme();
  const g = glyphs({ D: colors.navy900, K: colors.cream, S: colors.sun });
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {g[id] ?? <Ellipse cx={24} cy={24} rx={18} ry={18} fill={colors.sage} stroke={colors.navy900} strokeWidth={2.2} />}
    </Svg>
  );
}
