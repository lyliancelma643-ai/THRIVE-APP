import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { SPACING } from './tokens';

export type GlassButtonProps = {
  label?: string;
  /** Icône du canevas (`icons.tsx`) : à préférer. */
  glyph?: IconName;
  /** Ancien : nom Ionicons (compatibilité des écrans existants). */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** `.gbtn.tinted` : action validante (OK, Terminé, Ajouter) ; une seule teintée par barre. */
  tinted?: boolean;
  disabled?: boolean;
  /** Obligatoire pour un bouton icône seule. */
  accessibilityLabel?: string;
  /** Taille de l'icône (défaut : 21 seule, 18 avec libellé). */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.gbtn.glass` : capsule de verre 44 pt (icône seule = 44 × 44 `.ic`), libellé Inter 500 17/22
 * (600 si teinté). Neutre = encre `label`, teinté = `glassTint` + `tintInk`.
 */
export function GlassButton({ label, glyph, icon, onPress, tinted, disabled, accessibilityLabel, iconSize, style }: GlassButtonProps) {
  const { colors } = useTheme();
  const ink = tinted ? colors.tintInk : colors.label;
  const size = iconSize ?? (label ? 18 : 21);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      <GlassSurface interactive tinted={tinted} radius={22} style={{ minHeight: SPACING.touchMin, minWidth: SPACING.touchMin }}>
        <View
          style={{
            minHeight: SPACING.touchMin,
            minWidth: SPACING.touchMin,
            paddingHorizontal: label ? 12 : 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {glyph ? <Icon name={glyph} size={size} color={ink} /> : icon ? <Ionicons name={icon} size={size} color={ink} /> : null}
          {label ? (
            <ThemedText variant="body" weight={tinted ? 600 : 500} style={{ color: ink }}>
              {label}
            </ThemedText>
          ) : null}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

export type GlassPairItem = {
  glyph: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  /** Pastille de notification (ex. non-lues). */
  badge?: boolean;
};

/**
 * `.gbtn.pair` : une seule capsule de verre portant deux actions icône (cloche + compte), cellules 40 × 44.
 */
export function GlassPair({ items, tinted }: { items: readonly GlassPairItem[]; tinted?: boolean }) {
  const { colors } = useTheme();
  const ink = tinted ? colors.tintInk : colors.label;
  return (
    <GlassSurface interactive tinted={tinted} radius={22}>
      <View style={{ flexDirection: 'row', height: SPACING.touchMin, paddingHorizontal: 4 }}>
        {items.map((it) => (
          <Pressable
            key={it.accessibilityLabel}
            onPress={it.onPress}
            accessibilityRole="button"
            accessibilityLabel={it.accessibilityLabel}
            style={({ pressed }) => ({ width: 40, height: SPACING.touchMin, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name={it.glyph} size={20} color={ink} />
            {it.badge ? (
              <View style={{ position: 'absolute', top: 10, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sysRed }} />
            ) : null}
          </Pressable>
        ))}
      </View>
    </GlassSurface>
  );
}

/** `.grp` : groupe de boutons de barre (gap 8). */
export function GlassGroup({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}
