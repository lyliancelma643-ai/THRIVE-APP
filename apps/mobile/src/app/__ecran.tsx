import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { FloatingTabBar, STYLE_KEYS, tabLayoutFor, useTheme, type StyleKey } from '../design';
import { GALLERY } from '../dev-gallery';

/**
 * Banc de comparaison avec le canevas Claude Design (DEV uniquement) :
 * /__ecran?e=K&s=nuit affiche l'écran K seul, avec ses données de démonstration, dans le style demandé.
 * Utilisé par scripts/design/compare-ecrans.mjs (capture app vs maquette). Jamais livré.
 */
export default function EcranDeDemo() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Ecran />;
}

function Ecran() {
  const { e, s } = useLocalSearchParams<{ e?: string; s?: string }>();
  const { style, setStyle, colors } = useTheme();
  const wanted = (STYLE_KEYS as readonly string[]).includes(String(s)) ? (s as StyleKey) : null;
  useEffect(() => {
    if (wanted && wanted !== style) setStyle(wanted);
  }, [wanted, style, setStyle]);

  const screen = GALLERY.find((g) => g.id === e);
  if (!screen) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: colors.bgGrouped }}>
        <Text style={{ color: colors.label }}>{`Écrans disponibles : ${GALLERY.map((g) => g.id).join(', ') || 'aucun'}`}</Text>
      </View>
    );
  }
  if (wanted && wanted !== style) return <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} />;
  const layout = tabLayoutFor(style);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID={`ecran-${screen.id}`}>
      <View style={{ flex: 1 }}>{screen.render()}</View>
      {screen.tab ? (
        <FloatingTabBar
          tabs={layout.tabs.map((t) => ({ key: t.route, label: t.label, glyph: t.glyph }))}
          activeKey={screen.tab}
          onSelect={() => {}}
          prominent={{
            key: 'prominent', label: layout.prominent.label, glyph: layout.prominent.glyph,
            tinted: layout.prominent.tone === 'tinted' || (layout.prominent.tone === 'auto' && screen.tab === layout.prominent.route),
            onPress: () => {},
          }}
        />
      ) : null}
    </View>
  );
}
