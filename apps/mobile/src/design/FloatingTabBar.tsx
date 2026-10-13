import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { SPACING } from './tokens';

export type FloatingTab = {
  key: string;
  label: string;
  /** Icône du canevas (`icons.tsx`) : à préférer. */
  glyph?: IconName;
  /** Ancien : nom Ionicons (compatibilité). */
  icon?: keyof typeof Ionicons.glyphMap;
};

export type FloatingTabBarProps = {
  tabs: readonly FloatingTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  /**
   * Onglet Prominent (`.prom`) : rond de 62 pt détaché, icône seule (le libellé ne sert qu'à VoiceOver).
   * `tinted` = `.glass.tinted` (action active) ; sinon `.glass.plainglass` (verre neutre).
   */
  prominent?: FloatingTab & { onPress: () => void; tinted?: boolean };
};

/** Hauteur à réserver sous le contenu : barre + marge basse (hors zone sûre). */
export const TAB_BAR_INSET = SPACING.tabbarH + SPACING.space6;

/**
 * `.tabbar` : capsule de verre de 62 pt (`.tabs`, padding 4) à 3 onglets + onglet Prominent rond détaché.
 * Onglet actif (`.tab.on`) : fond `tabOn`, icône et libellé `tintText` ; inactifs : encre `label`.
 * Rendue dans le flux (pas en absolu) : le contenu s'arrête au-dessus ; le fond reprend `bgGrouped`.
 */
export function FloatingTabBar({ tabs, activeKey, onSelect, prominent }: FloatingTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const draw = (t: FloatingTab, color: string, size: number) =>
    t.glyph ? <Icon name={t.glyph} size={size} color={color} /> : t.icon ? <Ionicons name={t.icon} size={size} color={color} /> : null;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16,
        paddingTop: SPACING.space2,
        paddingBottom: insets.bottom > 0 ? Math.max(insets.bottom - 9, 8) : 25,
        backgroundColor: colors.bgGrouped,
      }}
    >
      <GlassSurface radius={31} style={{ flex: 1 }}>
        <View accessibilityRole="tabbar" style={{ flexDirection: 'row', height: SPACING.tabbarH - 2, padding: 4 }}>
          {tabs.map((t) => {
            const active = t.key === activeKey;
            const color = active ? colors.tintText : colors.label;
            return (
              <Pressable
                key={t.key}
                testID={`tab-${t.key}`}
                onPress={() => onSelect(t.key)}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1, borderRadius: 27, gap: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: active ? colors.tabOn : 'transparent',
                }}
              >
                {draw(t, color, 24)}
                <ThemedText variant="cap2" numberOfLines={1} style={{ color, fontSize: 10, lineHeight: 12, letterSpacing: 0.1 }}>
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
      {prominent ? (
        <Pressable
          testID="tab-prominent"
          onPress={prominent.onPress}
          accessibilityRole="button"
          accessibilityLabel={prominent.label}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <GlassSurface interactive tinted={prominent.tinted} radius={31} style={{ width: SPACING.tabbarH, height: SPACING.tabbarH }}>
            <View style={{ width: SPACING.tabbarH - 2, height: SPACING.tabbarH - 2, alignItems: 'center', justifyContent: 'center' }}>
              {draw(prominent, prominent.tinted ? colors.tintInk : colors.label, 25)}
            </View>
          </GlassSurface>
        </Pressable>
      ) : null}
    </View>
  );
}
