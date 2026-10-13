import { Ionicons } from '@expo/vector-icons';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useCardShadow } from './Card';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { Toggle } from './Toggle';
import { CANVAS, SPACING, type ColorTokens } from './tokens';

export type ListRowProps = {
  /** `.t` : 17/22. */
  title: string;
  /** `.d` : 15/20 `label2`. */
  subtitle?: string;
  /** `.val` : valeur à droite, 17/22 `label2`. */
  value?: string;
  /** `.ibadge` : pastille d'icône du canevas (30 pt, rayon 8, glyphe blanc 18). */
  glyph?: IconName;
  /** Ancien : nom Ionicons (compatibilité des écrans existants). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Token de fond de la pastille (sysOrange, sysBlue, sysIndigo, sysGreen, tint…). */
  iconColor?: keyof ColorTokens;
  /** `.ibadge.lg` / `.rowi.ico-lg` : pastille 44 pt (rayon 12), filet décalé à 72. */
  large?: boolean;
  /** Élément de tête libre (avatar 44, vignette) : remplace la pastille. Préciser `leadingInset` (60 ou 72). */
  leading?: ReactNode;
  leadingInset?: number;
  /** Chevron `.chev` à droite (défaut : vrai si `onPress`). */
  chevron?: boolean;
  /** `.tgl` : interrupteur à droite ; toucher la rangée le bascule. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  /** Coche `tintText` à droite (rangée sélectionnée, `.rowi … .ctint` + check). */
  checked?: boolean;
  /** Contenu libre à droite (Tag, texte…). */
  accessory?: ReactNode;
  /** `.rowi.danger` : titre `sysRed`, centré. */
  destructive?: boolean;
  onPress?: () => void;
  /** Masque le filet (dernière rangée). Posé automatiquement par `<List>`. */
  last?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * `.rowi` : rangée inset grouped, 52 pt mini, padding 0 16, gap 12 ; filet 0,5 pt `separator` décalé à 16
 * (60 avec pastille, 72 avec grande pastille). À placer dans `<List>`.
 */
export function ListRow({
  title, subtitle, value, glyph, icon, iconColor = 'tint', large, leading, leadingInset, chevron, toggle, checked,
  accessory, destructive, onPress, last, accessibilityLabel, accessibilityHint,
}: ListRowProps) {
  const { colors } = useTheme();
  const press = onPress ?? (toggle ? () => toggle.onChange(!toggle.value) : undefined);
  const showChevron = chevron ?? (!!onPress && !toggle && !accessory && !checked && !destructive);
  const hasBadge = !!(glyph || icon);
  const inset = leading ? (leadingInset ?? 60) : hasBadge ? (large ? 72 : 60) : 16;
  const box = large ? 44 : 30;
  // Glyphe blanc sur les pastilles de couleur système ; sur `tint` (jaune en Nuit calme) l'encre `tintInk`.
  const badgeInk = iconColor === 'tint' ? colors.tintInk : CANVAS.white;
  const content = (
    <View style={{ minHeight: SPACING.rowMin, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {leading ?? (hasBadge ? (
        <View
          style={{
            width: box, height: box, borderRadius: large ? 12 : 8, backgroundColor: colors[iconColor],
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {glyph ? (
            <Icon name={glyph} size={large ? 24 : 18} color={badgeInk} strokeWidth={2} />
          ) : icon ? (
            <Ionicons name={icon} size={large ? 24 : 18} color={badgeInk} />
          ) : null}
        </View>
      ) : null)}
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 11 }}>
        <ThemedText
          variant="body"
          style={{ color: destructive ? colors.sysRed : colors.label, textAlign: destructive ? 'center' : 'left' }}
        >
          {title}
        </ThemedText>
        {subtitle ? <ThemedText variant="sub" color="label2">{subtitle}</ThemedText> : null}
      </View>
      {value ? <ThemedText variant="body" color="label2" numberOfLines={1}>{value}</ThemedText> : null}
      {accessory}
      {toggle ? <Toggle value={toggle.value} onValueChange={toggle.onChange} accessibilityLabel={title} /> : null}
      {checked ? <Icon name="check" size={20} color={colors.tintText} strokeWidth={2.6} /> : null}
      {showChevron ? <Icon name="chevronRight" size={16} color={colors.label3} strokeWidth={2.4} /> : null}
      {!last ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', bottom: 0, right: 0, left: inset,
            height: StyleSheet.hairlineWidth, backgroundColor: colors.separator,
          }}
        />
      ) : null}
    </View>
  );
  if (!press) return content;
  return (
    <Pressable
      onPress={press}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityState={toggle ? { checked: toggle.value } : checked !== undefined ? { selected: checked } : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill3 : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}
ListRow.isListItem = true;

export type ListProps = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/**
 * `.list` : groupe inset grouped, fond `bgGrouped2`, rayon 26 (22 en Carnet), ombre Carnet.
 * Pose `last` sur la dernière `ListRow`/`Field` (le filet de séparation s'y arrête).
 */
export function List({ children, style }: ListProps) {
  const { colors, metrics } = useTheme();
  const shadow = useCardShadow();
  const items = Children.toArray(children);
  const lastIdx = items.length - 1;
  return (
    <View style={[{ backgroundColor: colors.bgGrouped2, borderRadius: metrics.rowRadius, ...shadow }, style]}>
      <View style={{ borderRadius: metrics.rowRadius, overflow: 'hidden' }}>
        {items.map((c, i) => {
          if (!isValidElement(c)) return c;
          const el = c as ReactElement<{ last?: boolean }>;
          const isItem = (el.type as { isListItem?: boolean }).isListItem;
          return isItem && el.props.last === undefined ? cloneElement(el, { last: i === lastIdx }) : el;
        })}
      </View>
    </View>
  );
}

/** Ancien nom de `List` (conservé pour les écrans existants). */
export const ListGroup = List;
