import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { CANVAS } from './tokens';
import type { ReactNode } from 'react';

export type GlassMode = 'liquid' | 'blur' | 'opaque';

function liquidSupported(): boolean {
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

/** Choix du rendu : verre natif iOS 26+, sinon flou expo-blur, sinon opaque (Réduire la transparence). */
export function useGlassMode(): GlassMode {
  const { reduceTransparency } = useTheme();
  if (reduceTransparency) return 'opaque';
  return liquidSupported() ? 'liquid' : 'blur';
}

export type GlassSurfaceProps = {
  children?: ReactNode;
  /** `.glass.strong` : feuilles flottantes, cartes posées sur une vidéo. */
  strong?: boolean;
  radius?: number;
  /** Réaction au toucher du verre natif. */
  interactive?: boolean;
  /** `.glass.tinted` : verre teinté `glassTint`, encre `tintInk` (bouton validé, onglet Prominent actif). */
  tinted?: boolean;
  /** Teinte libre (remplace le fond du verre). Préférer `tinted`. */
  tintColor?: string;
  /** Flou plus fort des feuilles `.sheet.glassy` (blur 30 au lieu de 16). */
  heavy?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Surface Liquid Glass (`.glass`) : fond `glass`, bord 1 px `glassEdge`, reflet spéculaire haut `glassSpec`,
 * pas d'ombre portée. Règle : un seul empilement de verre par zone, jamais verre sur verre.
 */
export function GlassSurface({ children, strong, radius = 9999, interactive, tinted, tintColor, heavy, style }: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();
  const mode = useGlassMode();
  const scheme = isDark ? 'dark' : 'light';
  const tintFill = tintColor ?? (tinted ? colors.glassTint : undefined);
  const box: ViewStyle = { borderRadius: radius, overflow: 'hidden' };
  const fill = strong ? colors.glassStrong : colors.glass;
  const edgeColor = tinted ? CANVAS.tintedEdge : colors.glassEdge;
  const specColor = tinted ? CANVAS.tintedSpec : colors.glassSpec;
  const edge: ViewStyle = { borderWidth: 1, borderColor: edgeColor };

  if (mode === 'liquid') {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={scheme}
        isInteractive={interactive}
        tintColor={tintFill}
        style={[box, style]}
      >
        {children}
      </GlassView>
    );
  }
  if (mode === 'blur') {
    return (
      <View style={[box, edge, style]}>
        <BlurView
          intensity={heavy ? 80 : strong ? 60 : 40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintFill ?? fill }]} />
        {/* Reflet spéculaire = `inset 0 1px 0 glass-spec` : un liseré haut qui suit l'arrondi. */}
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: radius, borderTopWidth: 1, borderColor: 'transparent', borderTopColor: specColor }]}
        />
        {children}
      </View>
    );
  }
  return (
    <View style={[box, edge, { backgroundColor: tinted ? colors.tint : tintColor ?? colors.bgGrouped2 }, style]}>{children}</View>
  );
}
