import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Image as SvgImage, Pattern, Rect } from 'react-native-svg';
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

/** Taille d'une tuile en points (les tuiles sont exportées à 1 px = 1 pt CSS, comme `background-image` du web). */
const TILE: Record<TextureName, { w: number; h: number }> = {
  grain: { w: 160, h: 160 },
  grainSoft: { w: 160, h: 160 },
  felt: { w: 160, h: 160 },
  feltStrong: { w: 160, h: 160 },
  enamel: { w: 160, h: 160 },
  paper: { w: 160, h: 160 },
  laid: { w: 30, h: 4 },
  linen: { w: 3, h: 3 },
  ribs: { w: 6, h: 6 },
};

/**
 * La matière d'un élément (`background-image: var(--mat-…)` du web) : la tuile est pavée par un motif SVG sur TOUTE
 * la surface de l'élément — aucune couture, aucun bloc de 160 pt isolé — et suit ses coins arrondis (le parent
 * coupe avec `overflow: hidden`). Les tuiles « lumière douce » du web sont précuites (blanc / noir translucides) :
 * la couleur de l'élément reste la sienne, seul le relief apparaît, sans dépendre d'un mode de mélange.
 * Jamais animée, jamais interactive.
 */
export function Texture({ name, opacity = 1, blend, style }: TextureProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mix = blend ?? TEXTURE_BLEND[name];
  const t = TILE[name];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity }, mix === 'soft-light' ? { mixBlendMode: 'soft-light' } : null, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`tx${uid}`} patternUnits="userSpaceOnUse" x={0} y={0} width={t.w} height={t.h}>
            <SvgImage href={TEXTURE_SOURCES[name]} x={0} y={0} width={t.w} height={t.h} preserveAspectRatio="none" />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#tx${uid})`} />
      </Svg>
    </View>
  );
}
