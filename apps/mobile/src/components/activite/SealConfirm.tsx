import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Icon, Paper, ThemedText, Velvet, useTheme } from '../../design';
import { Display, Ghost } from './parts';
import { SealCaption, SealLetter, useLate, useMinSealing } from '../motion/SealLetter';

export type SealStep = 'confirm' | 'sealing' | 'sealed' | 'paper';

/**
 * M16b / M16c · L'enveloppe fermée : papier vergé, rabat dessiné, cachet de velours avec un cadenas. Elle accompagne
 * « Lettre scellée » (M16b) et le repli papier (M16c) ; le texte de la lettre n'y figure jamais.
 */
export function SealedEnvelope() {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 2 }} accessible accessibilityRole="image" accessibilityLabel="Une enveloppe fermée">
      <Paper laid radius={12} style={{ width: 220, height: 140 }}>
        <View style={{ width: 220, height: 140 }}>
          <Svg width={220} height={140} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
            <Path d="M2 4 L110 78 L218 4" fill="none" stroke="rgba(2,37,57,0.22)" strokeWidth={1.5} />
          </Svg>
          <Velvet radius={20} style={{ position: 'absolute', left: 90, top: 62, width: 40, height: 40 }}>
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={18} color={colors.sage} />
            </View>
          </Velvet>
        </View>
      </Paper>
    </View>
  );
}

/**
 * M16 · Sceller : irréversible, avec confirmation. « Une fois scellée, personne ne pourra la lire avant le … , pas
 * même toi. » « Revenir » n'existe que AVANT « Sceller » ; ensuite il ne reste que « Continuer ». Repli papier (la base
 * est indisponible) : phrase calme, jamais un état d'échec. Contenu de la feuille de `LetterView`.
 */
export function SealPanel({
  step, openDate, onSeal, onBack, onDone,
}: { step: SealStep; openDate: string; onSeal: () => void; onBack: () => void; onDone: () => void }) {
  // Le rituel dure au moins 2,4 s : la confirmation du serveur n'est montrée qu'après.
  const shown = useMinSealing<SealStep>(step, 'sealing', 'sealed');
  const late = useLate(step === 'sealing');
  if (shown === 'sealing' || shown === 'sealed') {
    const finished = shown === 'sealed';
    return (
      <View style={{ paddingTop: 8 }}>
        <SealLetter phase={finished ? 'sealed' : 'sealing'} waiting={!finished && late} />
        <SealCaption phase={finished ? 'sealed' : late ? 'waiting' : 'sealing'} date={openDate} />
        {finished ? <View style={{ marginTop: 26 }}><Button variant="accent" label="Continuer" onPress={onDone} /></View> : null}
      </View>
    );
  }
  return (
    <View style={{ paddingTop: 16 }}>
      {step === 'confirm' ? (
        <>
          <SealLetter phase="ready" />
          <Display size={25} lineHeight={32}>{`Une fois scellée, personne ne pourra la lire avant le ${openDate}, pas même toi.`}</Display>
          <View style={{ marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Button variant="accent" label="Sceller" flex onPress={onSeal} />
            <Ghost label="Revenir" onPress={onBack} />
          </View>
        </>
      ) : (
        <>
          <SealedEnvelope />
          <View style={{ height: 18 }} />
          <ThemedText variant="body" style={{ fontSize: 17, lineHeight: 26 }}>
            {`Pour ce soir, la lettre se garde sur papier : dans une enveloppe fermée, avec la date du ${openDate} dessus.`}
          </ThemedText>
          <View style={{ marginTop: 26 }}><Button variant="accent" label="Continuer" onPress={onDone} /></View>
        </>
      )}
    </View>
  );
}
