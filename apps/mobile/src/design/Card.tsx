import { Children, useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icons';
import { ThemedText } from './ThemedText';
import { useTheme } from './ThemeProvider';
import { SHADOW_CARD } from './tokens';

/** Ombre portée des cartes et listes (`--shadow-card`), propre à chaque style. */
export function useCardShadow(): ViewStyle {
  const { styleKey } = useTheme();
  return SHADOW_CARD[styleKey];
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
 * `.card` : fond `bgGrouped2`, rayon 26, filet 1 pt `separator`, ombre `--shadow-card`, padding 16, `overflow: hidden`.
 * L'ombre vit sur un conteneur externe pour ne pas être rognée.
 */
export function Card({ children, padding = 16, onPress, accessibilityLabel, style }: CardProps) {
  const { colors, metrics } = useTheme();
  const shadow = useCardShadow();
  const body = (
    <View style={{ borderRadius: metrics.cardRadius, overflow: 'hidden', padding }}>{children}</View>
  );
  const outer: ViewStyle = { backgroundColor: colors.bgGrouped2, borderRadius: metrics.cardRadius, borderWidth: 1, borderColor: colors.separator, ...shadow };
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

/** `.card .kick` : sur-titre en capitales espacées 11,5/16, sauge, icône optionnelle (14 pt) à gauche. */
export function Kicker({ children, glyph, style }: { children: string; glyph?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      {glyph ? <Icon name={glyph} size={14} color={colors.sageText} /> : null}
      <ThemedText variant="kick" color="sageText" style={{ flexShrink: 1 }}>{children}</ThemedText>
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
