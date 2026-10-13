import { Children, useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icons';
import { ThemedText } from './ThemedText';
import { useTheme } from './ThemeProvider';
import { SHADOW_CARD_CARNET } from './tokens';

/** Ombre portée du Carnet (`--shadow-card`) ; rien en Natif et Nuit calme. */
export function useCardShadow(): ViewStyle | undefined {
  const { metrics } = useTheme();
  return metrics.cardShadow ? SHADOW_CARD_CARNET : undefined;
}

export type CardProps = {
  children?: ReactNode;
  /** Padding intérieur (défaut 16). 0 pour une carte à image pleine largeur. */
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.card` : fond `bgGrouped2`, rayon 26 (24 en Carnet), padding 16, `overflow: hidden`.
 * L'ombre (Carnet) vit sur un conteneur externe pour ne pas être rognée.
 */
export function Card({ children, padding = 16, onPress, accessibilityLabel, style }: CardProps) {
  const { colors, metrics } = useTheme();
  const shadow = useCardShadow();
  const body = (
    <View style={{ borderRadius: metrics.cardRadius, overflow: 'hidden', padding }}>{children}</View>
  );
  const outer: ViewStyle = { backgroundColor: colors.bgGrouped2, borderRadius: metrics.cardRadius, ...shadow };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [outer, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[outer, style]}>{body}</View>;
}

/** `.card .kick` : sur-titre 13/18 600 `label2`, icône optionnelle (14 pt) à gauche. */
export function Kicker({ children, glyph, style }: { children: string; glyph?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      {glyph ? <Icon name={glyph} size={14} color={colors.label2} /> : null}
      <ThemedText variant="foot" weight={600} color="label2" style={{ flexShrink: 1 }}>{children}</ThemedText>
    </View>
  );
}

/** `.grid2` : deux colonnes égales, gap 12 (chaque enfant occupe une colonne). */
export function Grid2({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const col = width > 0 ? (width - 12) / 2 : undefined;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, style]}
    >
      {Children.toArray(children).map((c, i) => (
        <View key={i} style={{ width: col ?? '48%' }}>{c}</View>
      ))}
    </View>
  );
}
