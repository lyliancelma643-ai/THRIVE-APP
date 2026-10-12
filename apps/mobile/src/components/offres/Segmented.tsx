import { Pressable, View } from 'react-native';
import { RADIUS, SPACING, ThemedText, useTheme } from '../../design';

/** Bascule à deux ou trois choix (En 2 versements / En une fois ; Vidéo / Téléphone). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', backgroundColor: colors.fill3, borderRadius: RADIUS.full, padding: 3 }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.label}
            style={{
              flex: 1,
              minHeight: SPACING.touchMin - 6,
              borderRadius: RADIUS.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.bgGrouped2 : 'transparent',
            }}
          >
            <ThemedText variant={on ? 'headline' : 'body'} color={on ? 'label' : 'label2'}>{o.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
