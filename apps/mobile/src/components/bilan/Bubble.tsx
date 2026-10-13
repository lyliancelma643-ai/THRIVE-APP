import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { ThemedText, useTheme } from '../../design';

type BubbleProps = {
  side: 'in' | 'out';
  children: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** `.bub` : bulle 17/22, rayon 20 (6 côté queue), 76 % de large ; `in` = `bubIn`, `out` = `tint` + `tintInk`. */
export function Bubble({ side, children, style, accessibilityLabel }: BubbleProps) {
  const { colors } = useTheme();
  const out = side === 'out';
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          maxWidth: '76%', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20,
          backgroundColor: out ? colors.tint : colors.bubIn,
          alignSelf: out ? 'flex-end' : 'flex-start',
          ...(out ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }),
        },
        style,
      ]}
    >
      <ThemedText variant="body" style={{ color: out ? colors.tintInk : colors.label }}>{children}</ThemedText>
    </View>
  );
}
