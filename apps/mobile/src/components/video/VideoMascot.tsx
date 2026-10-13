import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Image as SvgImage, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CANVAS, resolveVignetteId } from '../../design';
import { VIGNETTE_SOURCES } from '../../design/vignetteSources';

export type VideoMascotProps = {
  /** Diamètre du disque : 168 (O · Bientôt disponible), 120 (R · Après la séance). */
  size: number;
  /** Vignette de la mascotte (ACT-1001 : la pellicule ; ACT-1303 : la fête). */
  vignetteId: string;
  /** Couleur du halo (opacité comprise), ou null. */
  halo: string | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Médaillon de la mascotte des écrans O et R : disque crème en dégradé radial, anneaux blancs (1 pt à 55 %, puis 7 pt
 * à 10 %), ombre intérieure basse, mascotte masquée par un dégradé radial, halo teinté. Même construction que
 * `MascotMedallion`, mais avec une vignette au choix et les anneaux dans les trois styles.
 * Le composant occupe `size` × `size` ; halo et anneaux débordent.
 */
export function VideoMascot({ size, vignetteId, halo, accessibilityLabel = 'La mascotte THRIVE', style }: VideoMascotProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const pad = Math.ceil(size * 0.14);
  const box = size + pad * 2;
  const c = box / 2;
  const R = size / 2;
  const inset = size * 0.04;
  const img = size * 0.92;
  const ix = pad + inset;
  const m = CANVAS.medallion;
  const source = VIGNETTE_SOURCES[resolveVignetteId(vignetteId)];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[{ width: size, height: size }, style]}>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: 'absolute', left: -pad, top: -pad }}>
        <Defs>
          <RadialGradient id={`halo${uid}`} cx="50%" cy="50%" r="70.71%">
            <Stop offset="0" stopColor={halo ?? '#000000'} stopOpacity={halo ? 1 : 0} />
            <Stop offset="0.68" stopColor={halo ?? '#000000'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`disc${uid}`} cx="50%" cy="38%" r="79.65%">
            <Stop offset="0" stopColor={m.c0} />
            <Stop offset="0.62" stopColor={m.c1} />
            <Stop offset="1" stopColor={m.c2} />
          </RadialGradient>
          <LinearGradient id={`inner${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.62" stopColor={m.shadow} stopOpacity={0} />
            <Stop offset="1" stopColor={m.shadow} stopOpacity={1} />
          </LinearGradient>
          <RadialGradient id={`fadeAbs${uid}`} gradientUnits="userSpaceOnUse" cx={ix + img * 0.5} cy={ix + img * 0.46} r={img * 0.7358}>
            <Stop offset="0.56" stopColor="#ffffff" />
            <Stop offset="0.71" stopColor="#000000" />
          </RadialGradient>
          <Mask id={`mascotMask${uid}`} x={ix} y={ix} width={img} height={img} maskUnits="userSpaceOnUse">
            <Rect x={ix} y={ix} width={img} height={img} fill={`url(#fadeAbs${uid})`} />
          </Mask>
        </Defs>
        {halo ? <Circle cx={c} cy={c} r={size * 0.64} fill={`url(#halo${uid})`} /> : null}
        <Circle cx={c} cy={c} r={R + 4} fill={m.ring2} />
        <Circle cx={c} cy={c} r={R + 0.5} fill="none" stroke={m.ring} strokeWidth={1} />
        <Circle cx={c} cy={c} r={R} fill={`url(#disc${uid})`} />
        <Circle cx={c} cy={c} r={R} fill={`url(#inner${uid})`} />
        <SvgImage x={ix} y={ix} width={img} height={img} href={source} preserveAspectRatio="xMidYMid slice" mask={`url(#mascotMask${uid})`} />
      </Svg>
    </View>
  );
}
