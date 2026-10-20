import { useState } from 'react';
import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { TEXTURE_BLEND, type TextureBlend, type TextureName } from './materialSpecs';
import { TEXTURE_SOURCES } from './textures';

export type TextureProps = {
  name: TextureName;
  /** 0 à 1 (la tuile porte déjà son alpha ; `opacity` ne sert qu'à l'atténuer, ex. 0,22 sur la barre d'onglets). */
  opacity?: number;
  /** Remplace le mélange par défaut de la tuile. */
  blend?: TextureBlend;
  style?: StyleProp<ViewStyle>;
};

/**
 * Tuile de texture répétée, posée par-dessus un aplat de couleur (`background-image: var(--mat-…)`).
 * Jamais animée, jamais interactive. Repli : si la tuile ne charge pas, ou sur Android (où `resizeMode="repeat"`
 * n'est pas géré), on ne rend rien et l'aplat de couleur du parent reste lisible.
 */
export function Texture({ name, opacity = 1, blend, style }: TextureProps) {
  const [failed, setFailed] = useState(false);
  if (failed || Platform.OS === 'android') return null;
  const mix = blend ?? TEXTURE_BLEND[name];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }, mix === 'soft-light' ? { mixBlendMode: 'soft-light' } : null, style]}
    >
      <Image
        source={TEXTURE_SOURCES[name]}
        resizeMode="repeat"
        accessibilityIgnoresInvertColors
        onError={() => setFailed(true)}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
