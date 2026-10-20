/**
 * Tuiles de texture (apps/mobile/assets/brand/textures/*.png), exportées de maquettes-ios27/final.css par
 * scripts/design/export-textures.mjs (≤ 20 Ko chacune). Metro exige des `require` littéraux.
 * Module séparé de `materialSpecs.ts` pour que la logique reste testable sans résolution d'images.
 */
import type { ImageSourcePropType } from 'react-native';
import type { TextureName } from './materialSpecs';

export const TEXTURE_SOURCES: Record<TextureName, ImageSourcePropType> = {
  grain: require('../../assets/brand/textures/grain.png'),
  grainSoft: require('../../assets/brand/textures/grain-soft.png'),
  felt: require('../../assets/brand/textures/felt.png'),
  feltStrong: require('../../assets/brand/textures/felt-strong.png'),
  enamel: require('../../assets/brand/textures/enamel.png'),
  paper: require('../../assets/brand/textures/paper.png'),
  linen: require('../../assets/brand/textures/linen.png'),
  laid: require('../../assets/brand/textures/laid.png'),
  ribs: require('../../assets/brand/textures/ribs.png'),
};
