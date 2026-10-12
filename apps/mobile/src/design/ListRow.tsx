import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { RADIUS, SPACING, type ColorTokens } from './tokens';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Valeur alignée à droite (texte secondaire). */
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Token de la pastille d'icône (ex. sysOrange, sysTeal, sysIndigo, tint). */
  iconColor?: keyof ColorTokens;
  /** Chevron à droite (défaut : vrai si onPress). */
  chevron?: boolean;
  /** Toggle, coche, etc. */
  accessory?: ReactNode;
  destructive?: boolean;
  onPress?: () => void;
  /** Masque le filet bas (dernière rangée du groupe). */
  last?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Rangée inset grouped : 52 pt mini, filet 0,5 pt décalé à 60 pt quand il y a une pastille. */
export function ListRow({
  title, subtitle, value, icon, iconColor = 'tint', chevron, accessory, destructive, onPress, last,
  accessibilityLabel, accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const showChevron = chevron ?? !!onPress;
  const content = (
    <View style={{ minHeight: SPACING.rowMin, paddingLeft: SPACING.space4, flexDirection: 'row', alignItems: 'center' }}>
      {icon ? (
        <View
          style={{
            width: 30, height: 30, borderRadius: 8, marginRight: SPACING.space3,
            backgroundColor: colors[iconColor], alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={colors.tintInk} />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingVertical: SPACING.space3, paddingRight: SPACING.space2 }}>
        <ThemedText
          variant={destructive ? 'headline' : 'body'}
          style={{ color: destructive ? colors.sysRed : colors.label, textAlign: destructive ? 'center' : 'left' }}
        >
          {title}
        </ThemedText>
        {subtitle ? <ThemedText variant="subheadline" color="label2">{subtitle}</ThemedText> : null}
      </View>
      {value ? <ThemedText variant="body" color="label2" style={{ marginRight: SPACING.space2 }}>{value}</ThemedText> : null}
      {accessory}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.label3} style={{ marginRight: SPACING.space4, marginLeft: SPACING.space1 }} />
      ) : (
        <View style={{ width: SPACING.space4 }} />
      )}
      {!last ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', bottom: 0, right: 0, left: icon ? 60 : SPACING.space4,
            height: StyleSheet.hairlineWidth, backgroundColor: colors.separator,
          }}
        />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill3 : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}

/** Conteneur d'un groupe de ListRow (inset grouped). */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, style } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bgGrouped2,
        borderRadius: style === 'carnet' ? RADIUS.cardCarnet : RADIUS.card,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
