import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { MATERIALS, resolveTextStyle, useTheme } from '../../design';
import { archGeometry, archPath } from '../../design/materialSpecs';

type Props = {
  /** Numéro de maillot (ou initiale) affiché dans la fenêtre. */
  label: string;
  /** Fond de la fenêtre (couleur de l'enfant) et encre du numéro. */
  background: string;
  ink: string;
  width?: number;
  height?: number;
};

/**
 * Arche-portrait du choix du profil (`arch(166, 208, { cls: 'sm', inner })` du canevas) : le passe-partout de lin de
 * `<Arch>`, mais la fenêtre est un aplat à la couleur de l'enfant avec un reflet en haut et son numéro de maillot
 * en Fraunces. Décoratif (la rangée parente porte le libellé VoiceOver).
 */
export function JerseyArch({ label, background, ink, width = 166, height = 208 }: Props) {
  const { fontsLoaded } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = archGeometry(width, height, 'sm');
  const a = MATERIALS.arch;
  const outer = archPath(0, 0, g.outer.width, g.outer.height, g.outer.ry, g.outer.bottom);
  const inner = archPath(g.inner.x, g.inner.y, g.inner.width, g.inner.height, g.inner.ry, g.inner.bottom);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width, height, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 5,
      }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <ClipPath id={`win${uid}`}><Path d={inner} /></ClipPath>
          <LinearGradient id={`hi${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={outer} fill={a.color} />
        <Path d={outer} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        <Path d={inner} fill={background} />
        <Path d={inner} fill={`url(#hi${uid})`} clipPath={`url(#win${uid})`} />
        <Path d={inner} fill="none" stroke={a.innerEdge} strokeWidth={1} />
      </Svg>
      <View style={{ position: 'absolute', left: g.inner.x, top: g.inner.y, width: g.inner.width, height: g.inner.height, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          allowFontScaling={false}
          style={[
            resolveTextStyle('numeralHero', fontsLoaded),
            { fontSize: 94, lineHeight: 100, letterSpacing: -4, fontWeight: '500', color: ink, fontVariant: [] },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
