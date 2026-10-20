import { Text, type TextProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import { resolveTextStyle } from './typography';
import type { ColorTokens, TextStyleName } from './tokens';

export type ThemedTextProps = TextProps & {
  variant?: TextStyleName;
  /** Nom d'un token couleur (défaut `label`). */
  color?: keyof ColorTokens;
  /** Remplace la graisse du variant (ex. 500 pour `.gbtn`, 600 pour un libellé actif). */
  weight?: 400 | 500 | 600 | 700 | 800;
};

/**
 * Texte aux styles du canevas (`.t-*` : largetitle, title1-3, headline, body, callout, sub, foot, cap, cap2 ; `eyebrow`, `kick`, `navTitle`) ;
 * Dynamic Type respecté (allowFontScaling par défaut). `color` = nom d'un token (label, label2, tintText…).
 */
export function ThemedText({ variant = 'body', color = 'label', weight, style, ...rest }: ThemedTextProps) {
  const { colors, fontsLoaded } = useTheme();
  return <Text {...rest} style={[resolveTextStyle(variant, fontsLoaded, undefined, weight), { color: colors[color] }, style]} />;
}
