import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
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
  /** `glass-strong` : feuilles flottantes, cartes posées sur une vidéo. */
  strong?: boolean;
  radius?: number;
  /** Réaction au toucher du verre natif. */
  interactive?: boolean;
  /** Teinte (ex. bouton validé). */
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Surface Liquid Glass. Règle : un seul empilement de verre par zone, jamais verre sur verre.
 * Bord défini `glassEdge` + reflet `glassSpec`, pas d'ombre portée.
 */
export function GlassSurface({ children, strong, radius = 9999, interactive, tintColor, style }: GlassSurfaceProps) {
  const { colors, isDark } = useTheme();
  const mode = useGlassMode();
  const scheme = isDark ? 'dark' : 'light';
  const box: ViewStyle = { borderRadius: radius, overflow: 'hidden' };
  const fill = strong ? colors.glassStrong : colors.glass;
  const edge: ViewStyle = { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassEdge };

  if (mode === 'liquid') {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={scheme}
        isInteractive={interactive}
        tintColor={tintColor}
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
          intensity={strong ? 60 : 40}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tintColor ?? fill }]} />
        <View pointerEvents="none" style={[styles.spec, { backgroundColor: colors.glassSpec, borderRadius: radius }]} />
        {children}
      </View>
    );
  }
  return (
    <View style={[box, edge, { backgroundColor: tintColor ?? colors.bgGrouped2 }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  // Liseré intérieur haut (reflet spéculaire).
  spec: { position: 'absolute', top: 0, left: 8, right: 8, height: StyleSheet.hairlineWidth },
});
