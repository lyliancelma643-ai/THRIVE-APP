import { View } from 'react-native';
import { Icon, useTheme, withAlpha, type IconName } from '../../design';

/**
 * `.ibadge` des maquettes V4/V5 : pastille ronde (30 pt) `badgeBg`, glyphe `badgeInk`, anneau intérieur à 22 %.
 * À passer à `ListRow` par `leading` (+ `leadingInset={60}`) : le `glyph` de `ListRow` reste la pastille carrée iOS.
 */
export function RoundBadge({ glyph }: { glyph: IconName }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.badgeBg, borderWidth: 1, borderColor: withAlpha(colors.badgeInk, 0.22),
      }}
    >
      <Icon name={glyph} size={18} color={colors.badgeInk} strokeWidth={2} />
    </View>
  );
}
