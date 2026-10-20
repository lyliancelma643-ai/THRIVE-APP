import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { CANVAS, type ColorTokens } from './tokens';

export type AvatarProps = {
  /** Initiale(s) affichée(s). */
  label: string;
  size?: number;
  /** Token du fond (défaut `kid` : couleur de l'enfant). */
  color?: keyof ColorTokens;
  /** Couleur libre (couleur de passeport choisie par l'enfant) : remplace `color`. */
  background?: string;
  /** Encre du texte (défaut blanc ; `accentInk` sur fond jaune). */
  ink?: string;
  /** Photo (URL résolue) : remplace l'initiale. */
  uri?: string | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** `.avatar` : disque, initiale 600 (taille = 0,42 × diamètre, 17 par défaut), blanc sur `kid`. */
export function Avatar({ label, size = 44, color = 'kid', background, ink, uri, accessibilityLabel, style }: AvatarProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          width: size, height: size, borderRadius: size / 2, backgroundColor: background ?? colors[color],
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
      ) : (
        <ThemedText variant="headline" weight={600} style={{ color: ink ?? CANVAS.white, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.42) + 2, letterSpacing: 0 }}>
          {label.slice(0, 2).toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}
