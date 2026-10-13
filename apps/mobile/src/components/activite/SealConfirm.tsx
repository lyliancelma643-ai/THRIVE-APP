import { View } from 'react-native';
import { Button, ThemedText } from '../../design';
import { Display, Ghost } from './parts';

export type SealStep = 'confirm' | 'sealing' | 'sealed' | 'paper';

/**
 * M16 · Sceller : irréversible, avec confirmation. « Une fois scellée, personne ne pourra la lire avant le … , pas
 * même toi. » « Revenir » n'existe que AVANT « Sceller » ; ensuite il ne reste que « Continuer ». Repli papier (la base
 * est indisponible) : phrase calme, jamais un état d'échec. Contenu de la feuille de `LetterView`.
 */
export function SealPanel({
  step, openDate, onSeal, onBack, onDone,
}: { step: SealStep; openDate: string; onSeal: () => void; onBack: () => void; onDone: () => void }) {
  return (
    <View style={{ paddingTop: 16 }}>
      {step === 'confirm' || step === 'sealing' ? (
        <>
          <Display size={25} lineHeight={32}>{`Une fois scellée, personne ne pourra la lire avant le ${openDate}, pas même toi.`}</Display>
          <View style={{ marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Button variant="accent" label="Sceller" flex loading={step === 'sealing'} onPress={onSeal} />
            {step === 'confirm' ? <Ghost label="Revenir" onPress={onBack} /> : null}
          </View>
        </>
      ) : step === 'sealed' ? (
        <>
          <Display size={25} lineHeight={32}>{`Lettre scellée. Elle te reviendra par courriel le ${openDate}.`}</Display>
          <View style={{ marginTop: 26 }}><Button variant="accent" label="Continuer" onPress={onDone} /></View>
        </>
      ) : (
        <>
          <ThemedText variant="body" style={{ fontSize: 17, lineHeight: 26 }}>
            {`Pour ce soir, la lettre se garde sur papier : dans une enveloppe fermée, avec la date du ${openDate} dessus.`}
          </ThemedText>
          <View style={{ marginTop: 26 }}><Button variant="accent" label="Continuer" onPress={onDone} /></View>
        </>
      )}
    </View>
  );
}
