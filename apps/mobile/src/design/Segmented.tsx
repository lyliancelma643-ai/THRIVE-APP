import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from './ThemeProvider';
import { ThemedText } from './ThemedText';

export type SegmentedOption<K extends string> = { key: K; label: string; disabled?: boolean };

export type SegmentedProps<K extends string> = {
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** `.seg` : contrôle segmenté capsule 36 pt (fond `fill3`, padding 2), segment actif `segOn` + ombre, 14/18 500 (600 actif). */
export function Segmented<K extends string>({ options, value, onChange, accessibilityLabel, style }: SegmentedProps<K>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', height: 36, borderRadius: 18, padding: 2, backgroundColor: colors.fill3 }, style]}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            disabled={o.disabled}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on, disabled: !!o.disabled }}
            style={[
              { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, opacity: o.disabled ? 0.5 : 1 },
              on
                ? {
                    backgroundColor: colors.segOn,
                    shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                  }
                : null,
            ]}
          >
            <ThemedText variant="sub" weight={on ? 600 : 500} numberOfLines={1} style={{ fontSize: 14, lineHeight: 18, letterSpacing: -0.15 }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
