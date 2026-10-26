import { Image, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useWeb } from '../../design/web';

export type MascotPose = 'assise' | 'marche' | 'fiere';

/**
 * Images de la mascotte (`assets/mascotte/{pose}.webp`) : pas encore livrées. Quand elles le seront, il suffit
 * de les déclarer ici (require statique) ; en attendant, repli propre = disque soleil et deux yeux.
 */
export const MASCOT_IMAGES: Partial<Record<MascotPose, ImageSourcePropType>> = {};

/** Mascotte de la charge : rayon `size / 2`. Décorative (masquée aux lecteurs d'écran). */
export function Mascot({ size = 28, pose = 'marche' }: { size?: number; pose?: MascotPose }) {
  const w = useWeb();
  const src = MASCOT_IMAGES[pose];
  if (src) return <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />;
  const r = size / 2;
  const eye = w.isNight ? w.onAccent : w.text;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={r - 1} fill={w.accent} stroke={w.isNight ? 'none' : w.text} strokeWidth={w.isNight ? 0 : 2} />
      <Ellipse cx={r * 0.72} cy={r * 0.92} rx={r * 0.13} ry={r * 0.2} fill={eye} />
      <Ellipse cx={r * 1.28} cy={r * 0.92} rx={r * 0.13} ry={r * 0.2} fill={eye} />
    </Svg>
  );
}
