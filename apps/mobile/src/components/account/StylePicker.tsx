import { Pressable, View } from 'react-native';
import {
  Card, Icon, ThemedText, THEME_COLORS, useStyleChoice, useTheme, withAlpha, type ThemeStyleKey,
} from '../../design';
import { STYLE_PICKER_HINT, styleOptions } from './stylePickerModel';

export { STYLE_PICKER_HINT } from './stylePickerModel';

/**
 * Aperçu 9/13 d'un style (`styleTile` du canevas) : mini-écran dessiné avec les tokens de CE style, pas ceux du
 * style actif : arche de lin, deux lignes, pastille soleil, carte, barre d'onglets. Coche d'état par-dessus.
 */
function Preview({ k, selected }: { k: ThemeStyleKey; selected: boolean }) {
  const c = THEME_COLORS[k];
  const { colors } = useTheme();
  const veillee = k === 'veillee';
  return (
    <View
      style={[
        { width: '100%', aspectRatio: 9 / 13, borderRadius: 20, overflow: 'hidden', backgroundColor: c.bgGrouped },
        selected
          ? { borderWidth: 2.5, borderColor: colors.tint, shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } }
          : { borderWidth: 0.5, borderColor: colors.separator },
      ]}
    >
      <View
        style={{
          position: 'absolute', alignSelf: 'center', top: 10, width: 44, height: 50, borderTopLeftRadius: 22, borderTopRightRadius: 22,
          borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: veillee ? c.bgGrouped3 : c.linen,
          borderWidth: 1, borderColor: 'rgba(127,127,127,0.2)',
        }}
      />
      <View style={{ position: 'absolute', left: 12, right: 12, top: 68, height: 5, borderRadius: 3, backgroundColor: withAlpha(c.label, 0.26) }} />
      <View style={{ position: 'absolute', left: 12, width: '55%', top: 80, height: 5, borderRadius: 3, backgroundColor: withAlpha(c.label, 0.26) }} />
      <View style={{ position: 'absolute', left: 12, right: 12, top: 98, height: 24, borderRadius: 12, backgroundColor: c.sun }} />
      <View
        style={{
          position: 'absolute', left: 12, right: 12, top: 130, height: 30, borderRadius: 10, backgroundColor: c.bgGrouped2,
          borderWidth: 0.5, borderColor: 'rgba(127,127,127,0.25)',
        }}
      />
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 8, height: 12, borderRadius: 6, backgroundColor: withAlpha(c.label, veillee ? 0.14 : 0.08) }} />
    </View>
  );
}

type ViewProps = { value: ThemeStyleKey; onChange: (k: ThemeStyleKey) => void };

/** « Style de l'app » : deux tuiles-aperçus dans une carte (Lin, Veillée), coche sur l'actif, mention de bas de section. */
export function StylePickerView({ value, onChange }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View>
      <Card padding={0}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 14, paddingTop: 16, paddingHorizontal: 32, paddingBottom: 14 }}>
          {styleOptions(value).map((o) => (
            <Pressable
              key={o.key}
              testID={`style-${o.key}`}
              onPress={() => onChange(o.key)}
              accessibilityRole="radio"
              accessibilityLabel={o.accessibilityLabel}
              accessibilityState={{ selected: o.selected }}
              style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 8 }}
            >
              <Preview k={o.key} selected={o.selected} />
              <View style={{ alignItems: 'center' }}>
                <ThemedText variant="headline" numberOfLines={1}>{o.label}</ThemedText>
                <ThemedText variant="foot" color="label2" numberOfLines={1}>{o.description}</ThemedText>
              </View>
              <View
                style={{
                  width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: o.selected ? colors.tint : 'transparent',
                  borderWidth: o.selected ? 0 : 1.5, borderColor: colors.label4,
                }}
              >
                {o.selected ? <Icon name="check" size={14} color={colors.tintInk} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </Card>
      <ThemedText variant="foot" color="label2" style={{ paddingTop: 7, paddingHorizontal: 16 }}>{STYLE_PICKER_HINT}</ThemedText>
    </View>
  );
}

/** Branché sur le choix réel du style (AsyncStorage + synchro serveur). */
export function StylePicker() {
  const { styleKey, setStyle } = useStyleChoice();
  return <StylePickerView value={styleKey} onChange={setStyle} />;
}
