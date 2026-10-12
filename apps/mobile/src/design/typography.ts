import type { TextStyle } from 'react-native';
import { FONT_FAMILIES, TYPE, type TextStyleName } from './tokens';

/**
 * Traduit un style de texte en TextStyle RN. Tant que les polices ne sont pas
 * chargées (ou si le chargement échoue), on retombe sur la police système.
 * Les chiffres sont toujours tabulaires.
 */
export function resolveTextStyle(name: TextStyleName, fontsLoaded: boolean): TextStyle {
  const spec = TYPE[name];
  const base: TextStyle = {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    fontVariant: ['tabular-nums'],
  };
  if (spec.family === 'rounded') {
    // SF Pro Rounded : non distribuée, repli système en gras.
    return { ...base, fontWeight: '600' };
  }
  if (!fontsLoaded) return { ...base, fontWeight: String(spec.weight) as TextStyle['fontWeight'] };
  const fam = spec.family === 'display' ? FONT_FAMILIES.display : FONT_FAMILIES.sans;
  return { ...base, fontFamily: fam[spec.weight] };
}
