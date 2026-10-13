import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { Felt } from './Materials';
import { ThemedText } from './ThemedText';

export type TagTone = 'tint' | 'ok' | 'gray';

export type TagProps = {
  label: string;
  /** `.tag` (tint) · `.tag.ok` (vert) · `.tag.gray`. */
  tone?: TagTone;
  glyph?: IconName;
  style?: StyleProp<ViewStyle>;
};

/** `.tag` : étiquette 22 pt, rayon 11, texte 600 12/16, fond `badgeBg` (sauge) / `okSoft` / `fill3`. Non interactive. */
export function Tag({ label, tone = 'tint', glyph, style }: TagProps) {
  const { colors } = useTheme();
  const p = {
    tint: { bg: colors.badgeBg, ink: colors.badgeInk },
    ok: { bg: colors.okSoft, ink: colors.ok },
    gray: { bg: colors.fill3, ink: colors.label2 },
  }[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        { alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: p.bg, flexDirection: 'row', alignItems: 'center', gap: 4 },
        style,
      ]}
    >
      {glyph ? <Icon name={glyph} size={12} color={p.ink} strokeWidth={2.2} /> : null}
      <ThemedText variant="cap" weight={600} style={{ color: p.ink }}>{label}</ThemedText>
    </View>
  );
}

export type ChipProps = {
  label: string;
  /** `.chip.on` : feutre marine en Lin, crème en Veillée (jamais jaune : le soleil est pour le geste principal). */
  on?: boolean;
  glyph?: IconName;
  onPress?: () => void;
  /** Hauteur 44 et rayon 14 (grille de créneaux : `style="height:44px;border-radius:14px"`). */
  tall?: boolean;
  disabled?: boolean;
  /** Fond de la pastille non sélectionnée : `fill3` (défaut) ou `bgGrouped2` (sur fond groupé). */
  surface?: 'fill3' | 'bgGrouped2';
  style?: StyleProp<ViewStyle>;
};

/** `.chip` : capsule 36 pt, padding 0 14, texte 500 15/20, fond `fill3` ; sélectionnée = feutre (Lin) ou crème (Veillée). */
export function Chip({ label, on, glyph, onPress, tall, disabled, surface = 'fill3', style }: ChipProps) {
  const { colors, styleKey } = useTheme();
  const felt = !!on && styleKey === 'lin';
  const bg = on ? (felt ? colors.navy600 : colors.cream) : surface === 'bgGrouped2' ? colors.bgGrouped2 : colors.fill3;
  const ink = on ? (felt ? colors.cream : colors.navy900) : colors.label;
  const box: ViewStyle = {
    height: tall ? 44 : 36, borderRadius: tall ? 14 : 18, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  };
  const content = (
    <>
      {glyph ? <Icon name={glyph} size={16} color={ink} /> : null}
      <ThemedText variant="sub" weight={on && tall ? 600 : 500} style={{ color: ink }} numberOfLines={1}>{label}</ThemedText>
    </>
  );
  const body = felt ? (
    <Felt radius={tall ? 14 : 18} style={[{ opacity: disabled ? 0.35 : 1 }, style]}>
      <View style={box}>{content}</View>
    </Felt>
  ) : (
    <View style={[box, { backgroundColor: bg, opacity: disabled ? 0.35 : 1 }, style]}>{content}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={{ flexShrink: 0 }}
    >
      {body}
    </Pressable>
  );
}

/** `.chips` : rangée de `Chip` (gap 8). `scroll` : défilement horizontal au lieu d'être rognée. */
export function Chips({ children, scroll, style }: { children?: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingHorizontal: 16 }, style]}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[{ flexDirection: 'row', gap: 8 }, style]}>{children}</View>;
}

/** Groupe de pastilles (`Tag` / `Chip`) qui passe à la ligne : gap 8, wrap. */
export function Pills({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}
