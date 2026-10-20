import { useId, useState } from 'react';
import { Image, Platform, View, type ImageSourcePropType, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, Path, Pattern } from 'react-native-svg';
import { BRAND_LOGO } from './MascotHero';
import { archGeometry, archPath } from './materialSpecs';
import { TEXTURE_SOURCES } from './textures';
import { BASE_VIGNETTE_ID } from './vignetteIds';
import { VIGNETTE_SOURCES } from './vignetteSources';
import { MATERIALS, CANVAS } from './tokens';

export type ArchProps = {
  /** `md` (`.arch`, passe-partout 10), `sm` (7), `xs` (5). */
  size?: 'md' | 'sm' | 'xs';
  /** Largeur du cadre (défaut 220). */
  width?: number;
  /** Hauteur du cadre (défaut : 1,25 × la largeur). */
  height?: number;
  /** Image dans la fenêtre (défaut : la mascotte de base, ACT-0603). */
  source?: ImageSourcePropType;
  /** Badge du logo THRIVE en bas à droite (comme `MascotMedallion withLogo`). */
  withLogo?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.arch` : la fenêtre de la mascotte — un passe-partout de lin (#EFE9DD) taillé en arche, dans lequel l'image
 * est rognée (`object-fit: cover`). Étend `MascotMedallion` (même mascotte, mêmes props `withLogo` et
 * `accessibilityLabel`) avec la forme d'arche. Dessinée en SVG : les coins hauts sont des demi-ellipses
 * (rayons 50 % / 44,8 %), impossibles en `borderRadius`.
 */
export function Arch({
  size = 'md', width = 220, height, source, withLogo = false, accessibilityLabel = 'La mascotte THRIVE', style,
}: ArchProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const h = height ?? Math.round(width * 1.25);
  const w = box?.w ?? width;
  const hh = box?.h ?? h;
  const g = archGeometry(w, hh, size);
  const a = MATERIALS.arch;
  const outer = archPath(0, 0, g.outer.width, g.outer.height, g.outer.ry, g.outer.bottom);
  const inner = archPath(g.inner.x, g.inner.y, g.inner.width, g.inner.height, g.inner.ry, g.inner.bottom);
  const src = source ?? VIGNETTE_SOURCES[BASE_VIGNETTE_ID];
  const linen = Platform.OS !== 'android';
  const logo = Math.round(Math.min(w, hh) * (52 / 220));
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: lw, height: lh } = e.nativeEvent.layout;
    if (lw > 0 && lh > 0 && (Math.abs(lw - w) > 0.5 || Math.abs(lh - hh) > 0.5)) setBox({ w: lw, h: lh });
  };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={[
        {
          width, height: h,
          shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 22 }, elevation: 6,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${hh}`}>
        <Defs>
          <Pattern id={`linen${uid}`} patternUnits="userSpaceOnUse" width={3} height={3}>
            <SvgImage href={TEXTURE_SOURCES.linen} x={0} y={0} width={3} height={3} />
          </Pattern>
          <ClipPath id={`win${uid}`}>
            <Path d={inner} />
          </ClipPath>
        </Defs>
        <Path d={outer} fill={a.color} />
        {linen ? <Path d={outer} fill={`url(#linen${uid})`} /> : null}
        <Path d={outer} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        <Path d={inner} fill={a.inner} />
        <SvgImage
          x={g.inner.x}
          y={g.inner.y}
          width={g.inner.width}
          height={g.inner.height}
          href={src}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#win${uid})`}
        />
        <Path d={inner} fill="none" stroke={a.innerEdge} strokeWidth={1} />
      </Svg>
      {withLogo ? (
        <View
          style={{
            position: 'absolute', right: 2, bottom: 2, width: logo + 6, height: logo + 6, borderRadius: logo * 0.23 + 3,
            backgroundColor: CANVAS.white, alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          }}
        >
          <Image source={BRAND_LOGO} accessibilityIgnoresInvertColors style={{ width: logo, height: logo, borderRadius: logo * 0.23 }} />
        </View>
      ) : null}
    </View>
  );
}
