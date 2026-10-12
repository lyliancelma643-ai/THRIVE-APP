import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from './GlassSurface';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { RADIUS, SPACING } from './tokens';

export type FloatingTab = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

export type FloatingTabBarProps = {
  tabs: readonly FloatingTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  prominent?: FloatingTab & { onPress: () => void };
};

/** Hauteur à réserver sous le contenu : barre + marge basse (hors zone sûre). */
export const TAB_BAR_INSET = SPACING.tabbarH + SPACING.space6;

/**
 * Barre d'onglets flottante : capsule de verre à 3 onglets + onglet Prominent rond et teinté.
 * Onglet actif : fond `fill3`, icône et libellé `tint`. Rendue dans le flux (pas en absolu).
 */
export function FloatingTabBar({ tabs, activeKey, onSelect, prominent }: FloatingTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACING.space2,
        paddingHorizontal: SPACING.space4,
        paddingTop: SPACING.space2,
        paddingBottom: Math.max(insets.bottom, SPACING.space2),
        backgroundColor: colors.bgGrouped,
      }}
    >
      <GlassSurface radius={RADIUS.full} style={{ flex: 1 }}>
        <View accessibilityRole="tabbar" style={{ flexDirection: 'row', height: SPACING.tabbarH, padding: 4 }}>
          {tabs.map((t) => {
            const active = t.key === activeKey;
            const color = active ? colors.tint : colors.label2;
            return (
              <Pressable
                key={t.key}
                testID={`tab-${t.key}`}
                onPress={() => onSelect(t.key)}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1, minHeight: SPACING.touchMin, borderRadius: RADIUS.full,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? colors.fill3 : 'transparent',
                }}
              >
                <Ionicons name={t.icon} size={22} color={color} />
                <ThemedText variant="caption2" numberOfLines={1} style={{ color }}>{t.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
      {prominent ? (
        <Pressable
          onPress={prominent.onPress}
          accessibilityRole="button"
          accessibilityLabel={prominent.label}
          style={{
            width: SPACING.tabbarH, height: SPACING.tabbarH, borderRadius: RADIUS.full,
            backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={prominent.icon} size={22} color={colors.tintInk} />
          <ThemedText variant="caption2" numberOfLines={1} style={{ color: colors.tintInk }}>{prominent.label}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
