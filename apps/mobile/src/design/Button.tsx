import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Enamel, Felt } from './Materials';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './icons';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';

export type ButtonVariant = 'prom' | 'gray' | 'plain' | 'plainglass' | 'accent' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  /**
   * `prom` (`.btn.prom`) : bouton principal — feutre marine en Lin, ÉMAIL jaune en Veillée (le seul geste soleil) ;
   * `accent` (`.btn.sun`) : émail jaune dans les deux styles ; `gray` : `fill3` + texte `label` ;
   * `plain` : texte seul ; `plainglass` : capsule de verre neutre ; `danger` : texte `sysRed` sur `fill2`.
   * Un seul émail par écran : un second bouton principal passe en `gray`.
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
  // Pleine largeur : 20 pt de marge intérieure, pour que le texte (et son icône) ne touche jamais les bords.
  lg: { height: 52, radius: 26, padding: 20, full: true },
  md: { height: 44, radius: 22, padding: 20, full: false },
  sm: { height: 36, radius: 18, padding: 16, full: false },
};

/** `.btn` : capsule 52 / 44 / 36 pt, libellé 600 17/22 (15 en `sm`), variantes `prom gray plain plainglass accent danger`. */
export function Button({
  label, onPress, variant = 'prom', size = 'lg', glyph, disabled, loading, flex, accessibilityLabel, testID, style,
}: ButtonProps) {
  const { colors, styleKey } = useTheme();
  const m = SIZES[size];
  const off = !!disabled || !!loading;
  const lin = styleKey === 'lin';
  // `prom` : feutre marine en Lin, émail en Veillée ; `accent` : émail dans les deux styles.
  const material = variant === 'accent' || (variant === 'prom' && !lin) ? 'enamel' : variant === 'prom' ? 'felt' : null;
  const palette = {
    prom: lin ? { bg: colors.navy600, ink: colors.cream } : { bg: colors.accent, ink: colors.accentInk },
    gray: { bg: colors.fill3, ink: colors.label },
    plain: { bg: 'transparent', ink: lin ? colors.tint : colors.label },
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
      <ThemedText
        variant={size === 'sm' ? 'sub' : 'headline'}
        weight={variant === 'plain' ? 500 : 600}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{ color: palette.ink, flexShrink: 1, textAlign: 'center' }}
      >
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
      ) : material === 'felt' ? (
        <Felt strong radius={m.radius}>
          <View style={box}>{inner}</View>
        </Felt>
      ) : material === 'enamel' ? (
        <Enamel radius={m.radius}>
          <View style={box}>{inner}</View>
        </Enamel>
      ) : (
        <View style={[box, { backgroundColor: palette.bg }]}>{inner}</View>
      )}
    </Pressable>
  );
}
