import { Text, type TextProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { resolveTextStyle } from './typography';
import type { ColorTokens, TextStyleName } from './tokens';

export type ThemedTextProps = TextProps & {
  variant?: TextStyleName;
  /** Nom d'un token couleur (défaut `label`). */
  color?: keyof ColorTokens;
};

/** Texte aux styles iOS 27 ; Dynamic Type respecté (allowFontScaling par défaut). */
export function ThemedText({ variant = 'body', color = 'label', style, ...rest }: ThemedTextProps) {
  const { colors, fontsLoaded } = useTheme();
  return <Text {...rest} style={[resolveTextStyle(variant, fontsLoaded), { color: colors[color] }, style]} />;
}
