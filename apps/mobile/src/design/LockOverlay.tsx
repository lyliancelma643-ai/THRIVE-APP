import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useGlassMode } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { withAlpha } from './tokens';

export type MutedPreviewProps = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/**
 * `.muted-preview` : aperçu désaturé (gris 90 %) à 45 % d'opacité. Les enfants sont factices (jamais de
 * données réelles d'un autre compte) et cachés à VoiceOver.
 */
export function MutedPreview({ children, style }: MutedPreviewProps) {
  const filter = Platform.OS === 'web' ? ({ filter: 'grayscale(0.9)' } as object) : ({ filter: [{ grayscale: 0.9 }] } as object);
  return (
    <View
      {...(Platform.OS === 'web' ? {} : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const })}
      pointerEvents="none"
      style={[{ opacity: 0.45 }, filter, style]}
    >
      {children}
    </View>
  );
}

export type LockOverlayProps = {
  /** Aperçu flouté derrière (`<MutedPreview>` ou n'importe quelle vue factice). */
  preview: ReactNode;
  /** Carte d'invitation par-dessus (ex. « Le Bilan s'ouvre avec un coach » + boutons). */
  children?: ReactNode;
  /** Position de la carte : centrée (`place-items: center`, défaut) ou collée en bas. */
  align?: 'center' | 'end';
  style?: StyleProp<ViewStyle>;
};

/**
 * `.lock-ov` : un aperçu (désaturé + flou 6) recouvert d'un voile `bgGrouped2` à 55 %, avec la carte d'invitation
 * au-dessus. L'aperçu reste visible mais inerte ; la carte porte les actions.
 */
export function LockOverlay({ preview, children, align = 'center', style }: LockOverlayProps) {
  const { colors, isDark } = useTheme();
  const mode = useGlassMode();
  return (
    <View style={[{ flex: 1 }, style]}>
      {preview}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        {mode !== 'opaque' ? <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.bgGrouped2, mode === 'opaque' ? 0.9 : 0.55) }]} />
      </View>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { justifyContent: align === 'end' ? 'flex-end' : 'center', alignItems: 'stretch' }]}
      >
        {children}
      </View>
    </View>
  );
}
