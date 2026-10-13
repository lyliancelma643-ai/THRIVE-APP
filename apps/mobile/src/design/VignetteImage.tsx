import { Image, type ImageProps, type ImageStyle, type StyleProp } from 'react-native';
import { resolveVignetteId } from './vignetteIds';
import { VIGNETTE_SOURCES } from './vignetteSources';

export type VignetteImageProps = Omit<ImageProps, 'source'> & {
  /** Identifiant d'activité (ACT-0101…) ou BON-01. Inconnu / ACT-0704 : repli sur la mascotte (ACT-0603). */
  id: string | null | undefined;
  /** Libellé lu par VoiceOver ; absent = image décorative. */
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
};

export function VignetteImage({ id, accessibilityLabel, style, resizeMode = 'cover', ...rest }: VignetteImageProps) {
  const source = VIGNETTE_SOURCES[resolveVignetteId(id)];
  return (
    <Image
      {...rest}
      source={source}
      resizeMode={resizeMode}
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
