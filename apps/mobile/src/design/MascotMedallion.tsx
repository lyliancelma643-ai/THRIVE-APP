import { useId } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Image as SvgImage, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BRAND_LOGO } from './MascotHero';
import { useTheme } from './ThemeProvider';
import { CANVAS, withAlpha } from './tokens';
import { VIGNETTE_SOURCES } from './vignetteSources';
import { BASE_VIGNETTE_ID } from './vignetteIds';

export type MascotMedallionProps = {
  /** Diamètre du disque : 220 (Bienvenue), 112 (Connexion), 76 (en-têtes). */
  size?: number;
  /** Badge du logo THRIVE en bas à droite, anneau blanc (Bienvenue Natif). */
  withLogo?: boolean;
  /** false : sans halo ni anneaux (le disque seul). */
  halo?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Médaillon rond de la mascotte (Main.dc.html / V1-B) : halo radial teinté (`tint` 16 %/12 % en Natif, soleil 30 %
 * en Carnet, aucun en Nuit calme), disque crème en dégradé radial (#F6F2EA → #EEE8DD 62 % → #E4DCCD) avec anneaux
 * blancs et ombre intérieure basse (Natif/Carnet), mascotte (ACT-0603) masquée par un dégradé radial, badge du logo.
 * Le composant occupe `size` × `size` ; le halo et les anneaux débordent.
 */
export function MascotMedallion({ size = 220, withLogo = false, halo = true, accessibilityLabel = 'La mascotte THRIVE', style }: MascotMedallionProps) {
  const { colors, style: uiStyle } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const nuit = uiStyle === 'nuit';
  const pad = Math.ceil(size * 0.14);
  const box = size + pad * 2;
  const c = box / 2;
  const R = size / 2;
  const haloColor = nuit || !halo ? null : uiStyle === 'carnet' ? withAlpha(colors.sun, 0.3) : withAlpha(colors.tint, size >= 160 ? 0.16 : 0.12);
  const inset = size * 0.04;
  const img = size * 0.92;
  const ix = pad + inset;
  const m = CANVAS.medallion;
  const logo = Math.round(size * (52 / 220));
  const source = VIGNETTE_SOURCES[BASE_VIGNETTE_ID];
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[{ width: size, height: size }, style]}>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: 'absolute', left: -pad, top: -pad }}>
        <Defs>
          <RadialGradient id={`halo${uid}`} cx="50%" cy="50%" r="70.71%">
            <Stop offset="0" stopColor={haloColor ?? '#000000'} stopOpacity={haloColor ? 1 : 0} />
            <Stop offset="0.68" stopColor={haloColor ?? '#000000'} stopOpacity={0} />
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
        {haloColor ? <Circle cx={c} cy={c} r={size * 0.64} fill={`url(#halo${uid})`} /> : null}
        {!nuit && halo ? (
          <>
            <Circle cx={c} cy={c} r={R + 4} fill={m.ring2} />
            <Circle cx={c} cy={c} r={R + 0.5} fill="none" stroke={m.ring} strokeWidth={1} />
          </>
        ) : null}
        <Circle cx={c} cy={c} r={R} fill={`url(#disc${uid})`} />
        {!nuit && halo ? <Circle cx={c} cy={c} r={R} fill={`url(#inner${uid})`} /> : null}
        <SvgImage
          x={ix}
          y={ix}
          width={img}
          height={img}
          href={source}
          preserveAspectRatio="xMidYMid slice"
          mask={`url(#mascotMask${uid})`}
        />
      </Svg>
      {withLogo ? (
        <View
          style={{
            position: 'absolute', right: size * 0.027 - 3, bottom: size * 0.027 - 3, width: logo + 6, height: logo + 6,
            borderRadius: logo * 0.23 + 3, backgroundColor: CANVAS.white,
            shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: logo, height: logo, borderRadius: logo * 0.23 }} />
        </View>
      ) : null}
    </View>
  );
}
