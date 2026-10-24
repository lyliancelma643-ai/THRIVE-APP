import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { FloatingTabBar, parseStyle, tabLayoutFor, useTheme } from '../design';
import { GALLERY } from '../dev-gallery';

/**
 * Banc de comparaison avec le canevas Claude Design (DEV uniquement) :
 * /__ecran?e=K&s=veillee affiche l'écran K seul, avec ses données de démonstration, dans le style demandé.
 * Utilisé par scripts/design/compare-ecrans.mjs (capture app vs maquette). Jamais livré.
 */
export default function EcranDeDemo() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Ecran />;
}

function Ecran() {
  const { e, s } = useLocalSearchParams<{ e?: string; s?: string }>();
  const { styleKey, setStyle, colors } = useTheme();
  // `?s=lin|veillee` (les anciennes valeurs sont normalisées).
  const wanted = parseStyle(s);
  useEffect(() => {
    if (wanted && wanted !== styleKey) setStyle(wanted);
  }, [wanted, styleKey, setStyle]);

  const screen = GALLERY.find((g) => g.id === e);
  if (!screen) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: colors.bgGrouped }}>
        <Text style={{ color: colors.label }}>{`Écrans disponibles : ${GALLERY.map((g) => g.id).join(', ') || 'aucun'}`}</Text>
      </View>
    );
  }
  if (wanted && wanted !== styleKey) return <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} />;
  const layout = tabLayoutFor(styleKey);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID={`ecran-${screen.id}`}>
      <View style={{ flex: 1 }}>{screen.render()}</View>
      {screen.tab ? (
        <BenchTabBar
          tabs={layout.tabs.map((t) => ({ key: t.route, label: t.label, glyph: t.glyph }))}
          initial={screen.tab}
          prominent={{
            key: 'prominent', label: layout.prominent.label, glyph: layout.prominent.glyph,
            onPress: () => {},
          }}
        />
      ) : null}
    </View>
  );
}

/** Barre du banc : l'onglet suit le toucher / le glissement (sans changer d'écran), pour éprouver la goutte. */
function BenchTabBar({ initial, ...rest }: Omit<React.ComponentProps<typeof FloatingTabBar>, 'activeKey' | 'onSelect'> & { initial: string }) {
  const [active, setActive] = React.useState(initial);
  return <FloatingTabBar {...rest} activeKey={active} onSelect={setActive} />;
}
