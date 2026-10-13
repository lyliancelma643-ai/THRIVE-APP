import type { TextStyle } from 'react-native';
import { FONT_FAMILIES, typeSpec, type TextSpec, type TextStyleName } from './tokens';

/**
 * Traduit un style de texte en TextStyle RN. Tant que les polices ne sont pas
 * chargées (ou si le chargement échoue), on retombe sur la police système.
 * Les chiffres sont toujours tabulaires. Le 3e paramètre (ancien style de l'app) est ignoré :
 * Lin et Veillée partagent la même échelle typographique.
 */
export function resolveTextStyle(
  name: TextStyleName,
  fontsLoaded: boolean,
  _style?: unknown,
  weight?: TextSpec['weight'],
): TextStyle {
  const spec = { ...typeSpec(name), ...(weight ? { weight } : null) };
  const base: TextStyle = {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    fontVariant: ['tabular-nums'],
    ...(spec.uppercase ? { textTransform: 'uppercase' as const } : null),
  };
  if (!fontsLoaded) {
    return {
      ...base,
      fontWeight: String(spec.weight) as TextStyle['fontWeight'],
      ...(spec.family === 'display' ? { fontFamily: 'serif' } : null),
    };
  }
  const fam = spec.family === 'display' ? FONT_FAMILIES.display : FONT_FAMILIES.sans;
  return { ...base, fontFamily: fam[spec.weight] };
}
