import { useEffect } from 'react';
import { View } from 'react-native';
import { Button, ThemedText } from '../../design';
import { closingLine, frTypo } from './flow';
import { Display, Frame, type Chrome } from './parts';

/** M9 · Pour finir : la phrase de clôture, à dire. */
export function ClosingView({ chrome, closing, onDone }: { chrome: Chrome; closing: string; onDone: () => void }) {
  return (
    <Frame chrome={chrome} padTop={60} cta={<Button variant="accent" label="C’est dit" flex onPress={onDone} />}>
      <ThemedText variant="body" color="label2" style={{ fontSize: 18, lineHeight: 24 }}>Pour finir, dis :</ThemedText>
      <Display size={38} lineHeight={46} style={{ marginTop: 14 }}>{frTypo(closing)}</Display>
    </Frame>
  );
}

/** M10 · « N minutes avec {enfant}. » : seul à l'écran une seconde, puis la synthèse (seul passage automatique du flot). */
export function MinutesView({ chrome, minutes, firstName, onElapsed }: { chrome: Chrome; minutes: number; firstName: string; onElapsed: () => void }) {
  useEffect(() => {
    const id = setTimeout(onElapsed, 1000);
    return () => clearTimeout(id);
  }, [onElapsed]);
  return (
    <Frame chrome={{ ...chrome, timer: null }} scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }} accessibilityLiveRegion="polite">
        <Display size={42} lineHeight={50} align="center">{closingLine(minutes, firstName)}</Display>
      </View>
    </Frame>
  );
}
