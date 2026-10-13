import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';
import { CANVAS } from './tokens';

export type ButtonVariant = 'prom' | 'gray' | 'plain' | 'plainglass' | 'accent' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * `prom` (`.btn.prom`) : bouton proéminent, capsule `tint` pleine largeur, reflet haut ;
   * `gray` : `fill2` + texte `tintText` ; `plain` : texte `tintText` seul ; `plainglass` : capsule de verre neutre ;
   * `accent` : `accent` + `accentInk` ; `danger` : texte `sysRed` sur `fill2`.
   */
  variant?: ButtonVariant;
  /** `lg` 52 pt pleine largeur (défaut) ; `md` 44 pt (`.btn.md`) ; `sm` 36 pt (`.btn.sm`), largeur au contenu. */
  size?: ButtonSize;
  glyph?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Occupe l'espace restant d'une rangée (`.f1`). */
  flex?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const SIZES: Record<ButtonSize, { height: number; radius: number; padding: number; full: boolean }> = {
  lg: { height: 52, radius: 26, padding: 0, full: true },
  md: { height: 44, radius: 22, padding: 20, full: false },
  sm: { height: 36, radius: 18, padding: 16, full: false },
};

/** `.btn` : capsule 52 / 44 / 36 pt, libellé 600 17/22 (15 en `sm`), variantes `prom gray plain plainglass accent danger`. */
export function Button({
  label, onPress, variant = 'prom', size = 'lg', glyph, disabled, loading, flex, accessibilityLabel, testID, style,
}: ButtonProps) {
  const { colors } = useTheme();
  const m = SIZES[size];
  const off = !!disabled || !!loading;
  const palette = {
    prom: { bg: colors.tint, ink: colors.tintInk },
    gray: { bg: colors.fill2, ink: colors.tintText },
    plain: { bg: 'transparent', ink: colors.tintText },
    plainglass: { bg: 'transparent', ink: colors.label },
    accent: { bg: colors.accent, ink: colors.accentInk },
    danger: { bg: colors.fill2, ink: colors.sysRed },
  }[variant];
  const box: ViewStyle = {
    height: m.height,
    borderRadius: m.radius,
    paddingHorizontal: m.padding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
  const inner = (
    <>
      {glyph ? <Icon name={glyph} size={size === 'sm' ? 16 : 19} color={palette.ink} /> : null}
      <ThemedText variant={size === 'sm' ? 'sub' : 'headline'} weight={variant === 'plain' ? 500 : 600} style={{ color: palette.ink }}>
        {loading ? '…' : label}
      </ThemedText>
    </>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy: !!loading }}
      style={({ pressed }) => [{ opacity: off ? 0.4 : pressed ? 0.8 : 1 }, m.full || flex ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, flex ? { flex: 1 } : null, style]}
    >
      {variant === 'plainglass' ? (
        <GlassSurface radius={m.radius}>
          <View style={box}>{inner}</View>
        </GlassSurface>
      ) : (
        <View
          style={[
            box,
            { backgroundColor: palette.bg },
            variant === 'prom'
              ? { borderWidth: 1, borderColor: CANVAS.promEdge, borderTopColor: CANVAS.promSpec }
              : null,
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}
