import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { COLORS, RADIUS, SPACING, STYLE_KEYS, STYLE_LABELS, ThemedText, useStyleChoice, useTheme, type StyleKey } from '../../design';

export const STYLE_PICKER_HINT = 'Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.';

/** Aperçu miniature d'un style, dessiné avec les tokens de CE style (pas ceux du style actif). */
function Preview({ k }: { k: StyleKey }) {
  const c = COLORS[k];
  return (
    <View style={{ height: 76, borderRadius: RADIUS.chip, backgroundColor: c.bgGrouped, padding: 8, justifyContent: 'space-between', overflow: 'hidden' }}>
      <View style={{ height: 8, width: '55%', borderRadius: 4, backgroundColor: c.label }} />
      <View style={{ borderRadius: 8, height: 26, backgroundColor: c.bgGrouped2, borderWidth: k === 'nuit' ? 0 : 0.5, borderColor: c.separator }} />
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.tint }} />
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.sage }} />
      </View>
    </View>
  );
}

/** Section « Style de l'app » : trois aperçus, coche sur le style actif (useStyleChoice). */
export function StylePicker() {
  const { colors } = useTheme();
  const { style, setStyle } = useStyleChoice();
  return (
    <View accessibilityRole="radiogroup" style={{ marginBottom: SPACING.space4 }}>
      <View style={{ flexDirection: 'row', gap: SPACING.space2 }}>
        {STYLE_KEYS.map((k) => {
          const selected = k === style;
          return (
            <Pressable
              key={k}
              onPress={() => setStyle(k)}
              accessibilityRole="radio"
              accessibilityLabel={`Style ${STYLE_LABELS[k]}`}
              accessibilityState={{ selected }}
              style={{
                flex: 1, minHeight: 44, padding: SPACING.space2, borderRadius: RADIUS.tile,
                backgroundColor: colors.bgGrouped2,
                borderWidth: 2, borderColor: selected ? colors.tint : 'transparent',
              }}
            >
              <Preview k={k} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.space2, minHeight: 20 }}>
                {selected ? <Ionicons name="checkmark-circle" size={16} color={colors.tint} /> : null}
                <ThemedText variant="footnote" style={{ fontWeight: selected ? '600' : '400' }} numberOfLines={1}>{STYLE_LABELS[k]}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <ThemedText variant="footnote" color="label2" style={{ marginTop: SPACING.space2, paddingHorizontal: SPACING.space2 }}>
        {STYLE_PICKER_HINT}
      </ThemedText>
    </View>
  );
}
