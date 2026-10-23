import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { Felt } from './Materials';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { Texture } from './Texture';
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
   * Toujours en feutre (marine #004E7A en Lin, #0B3C59 cerclé en Veillée) : jamais de jaune.
   */
  prominent?: FloatingTab & { onPress: () => void; badge?: number };
};

/** Hauteur à réserver sous le contenu : barre + marge basse (hors zone sûre). */
export const TAB_BAR_INSET = SPACING.tabbarH + SPACING.space6;

/**
 * `.tabbar` : capsule de verre grainé de 62 pt (`.tabs`, padding 5) à 3 onglets + onglet Prominent rond détaché.
 * Onglet actif (`.tab.on`) : fond `tabOn`, filet et icône/libellé `navActive` ; inactifs : encre `label`.
 * Rendue dans le flux (pas en absolu) : le contenu s'arrête au-dessus ; le fond reprend `bgGrouped`.
 */
export function FloatingTabBar({ tabs, activeKey, onSelect, prominent }: FloatingTabBarProps) {
  const { colors, styleKey } = useTheme();
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
        <View accessibilityRole="tabbar" style={{ flexDirection: 'row', height: SPACING.tabbarH - 2, padding: 5 }}>
          {/* ::before grain à 22 % (Veillée) ; la version Lin (grain blanc inversé à 10 %) est invisible, omise. */}
          {styleKey === 'veillee' ? <Texture name="grain" opacity={0.22} /> : null}
          {tabs.map((t) => {
            const active = t.key === activeKey;
            const color = active ? colors.navActive : colors.label;
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
                  borderWidth: 1, borderColor: active ? `${colors.navActive}42` : 'transparent',
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
          accessibilityLabel={prominent.badge ? `${prominent.label}, ${prominent.badge} non lu${prominent.badge > 1 ? 's' : ''}` : prominent.label}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Felt raised radius={SPACING.tabbarH / 2} style={{ width: SPACING.tabbarH, height: SPACING.tabbarH }}>
            <View style={{ width: SPACING.tabbarH, height: SPACING.tabbarH, alignItems: 'center', justifyContent: 'center' }}>
              {draw(prominent, colors.cream, 25)}
            </View>
          </Felt>
          {prominent.badge && prominent.badge > 0 ? (
            <View
              style={{
                position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10,
                backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bgGrouped, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ThemedText variant="cap2" weight={700} style={{ color: colors.accentInk, fontSize: 10, lineHeight: 12 }}>
                {prominent.badge > 9 ? '9+' : String(prominent.badge)}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}
