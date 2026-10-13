import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { CANVAS } from './tokens';

export type ToggleProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  /** Libellé lu par VoiceOver (obligatoire hors d'une ListRow). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * `.tgl` : interrupteur iOS 26/27, 64 × 28, pouce 39 × 24 blanc (ombre 0 2 6). Piste `fill` éteinte,
 * `sysGreen` allumée. Cible tactile élargie à 44 pt de haut.
 */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel, style }: ToggleProps) {
  const { colors } = useTheme();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={[{ width: 64, height: 28, borderRadius: 14, backgroundColor: value ? colors.sysGreen : colors.fill, opacity: disabled ? 0.4 : 1 }, style]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 39,
          height: 24,
          borderRadius: 12,
          backgroundColor: CANVAS.white,
          shadowColor: '#000000',
          shadowOpacity: 0.18,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 21] }) }],
        }}
      />
    </Pressable>
  );
}
