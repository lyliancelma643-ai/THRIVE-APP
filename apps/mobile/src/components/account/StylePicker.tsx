import { Pressable, Text, View } from 'react-native';
import {
  COLORS, Card, Icon, STYLE_KEYS, ThemedText, resolveTextStyle, useStyleChoice, useTheme, withAlpha, type StyleKey,
} from '../../design';

export const STYLE_PICKER_HINT = 'Change quand tu veux : tes moments, ton carnet et tes séances restent les mêmes.';

const LABEL: Record<StyleKey, string> = { natif: 'Natif', nuit: 'Nuit calme', carnet: 'Carnet' };
const SUBTITLE: Record<StyleKey, string> = { natif: 'Clair, iOS', nuit: 'Sombre', carnet: 'Crème, éditorial' };

/** Aperçu 9/15 d'un style, dessiné avec les tokens de CE style (pas ceux du style actif) : `Aa`, pastille, lignes, carte, barre. */
function Preview({ k, selected }: { k: StyleKey; selected: boolean }) {
  const c = COLORS[k];
  const { colors, fontsLoaded } = useTheme();
  const carnet = k === 'carnet';
  const nuit = k === 'nuit';
  const page = carnet ? c.bgGrouped : nuit ? c.bgGrouped : c.bgGrouped2;
  const head = carnet ? c.navy600 : page;
  const dot = k === 'natif' ? c.kid : c.sun;
  const aaInk = carnet ? c.cream : c.label;
  const aa = resolveTextStyle('headline', fontsLoaded, k, 700);
  const blockBg = k === 'natif' ? c.bgGrouped : c.bgGrouped2;
  return (
    <View
      style={[
        { width: '100%', aspectRatio: 9 / 15, borderRadius: 18, overflow: 'hidden', backgroundColor: page },
        selected
          ? { borderWidth: 2.5, borderColor: colors.tint, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } }
          : { borderWidth: 0.5, borderColor: colors.separator },
      ]}
    >
      <View style={{ height: '42%', backgroundColor: head, borderBottomLeftRadius: carnet ? 16 : 0, borderBottomRightRadius: carnet ? 16 : 0 }}>
        <Text
          style={[
            carnet ? resolveTextStyle('title1', fontsLoaded, 'carnet') : aa,
            { position: 'absolute', left: 10, bottom: 10, fontSize: carnet ? 16 : 15, lineHeight: 16, fontWeight: carnet ? '600' : '700', color: aaInk, letterSpacing: 0 },
          ]}
        >
          Aa
        </Text>
        <View style={{ position: 'absolute', right: 10, bottom: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: dot }} />
      </View>
      <View style={{ paddingVertical: 8, paddingHorizontal: 9, gap: 5 }}>
        <View style={{ height: 5, width: '70%', borderRadius: 3, backgroundColor: c.label3 }} />
        <View style={{ height: 5, width: '46%', borderRadius: 3, backgroundColor: c.label3 }} />
        <View style={{ marginTop: 3, height: 26, borderRadius: 9, backgroundColor: blockBg, borderWidth: 0.5, borderColor: 'rgba(127,127,127,0.18)' }} />
      </View>
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 7, height: 11, borderRadius: 6, backgroundColor: withAlpha(c.label, nuit ? 0.14 : 0.07) }} />
    </View>
  );
}

type ViewProps = { value: StyleKey; onChange: (k: StyleKey) => void };

/** « Style de l'app » : trois aperçus dans une carte, rond de sélection sous chacun, mention de bas de section. */
export function StylePickerView({ value, onChange }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View>
      <Card padding={0}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 14 }}>
          {STYLE_KEYS.map((k) => {
            const selected = k === value;
            return (
              <Pressable
                key={k}
                onPress={() => onChange(k)}
                accessibilityRole="radio"
                accessibilityLabel={`Style ${LABEL[k]}, ${SUBTITLE[k]}`}
                accessibilityState={{ selected }}
                style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 8 }}
              >
                <Preview k={k} selected={selected} />
                <View style={{ alignItems: 'center' }}>
                  <ThemedText variant="sub" weight={600} numberOfLines={1}>{LABEL[k]}</ThemedText>
                  <ThemedText variant="foot" color="label2" numberOfLines={1}>{SUBTITLE[k]}</ThemedText>
                </View>
                <View
                  style={{
                    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected ? colors.tint : 'transparent',
                    borderWidth: selected ? 0 : 1.5, borderColor: colors.label4,
                  }}
                >
                  {selected ? <Icon name="check" size={14} color={colors.tintInk} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <ThemedText variant="foot" color="label2" style={{ paddingTop: 7, paddingHorizontal: 16 }}>{STYLE_PICKER_HINT}</ThemedText>
    </View>
  );
}

/** Branché sur le choix réel du style (AsyncStorage + synchro serveur). */
export function StylePicker() {
  const { style, setStyle } = useStyleChoice();
  return <StylePickerView value={style} onChange={setStyle} />;
}
