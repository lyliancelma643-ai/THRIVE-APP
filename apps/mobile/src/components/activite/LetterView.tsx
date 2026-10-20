import { ScrollView, TextInput, View } from 'react-native';
import { Button, Paper, Sheet, ThemedText, resolveTextStyle, useTheme } from '../../design';
import { Eyebrow, Ghost, NO_FOCUS_RING } from './parts';
import { SealPanel, type SealStep } from './SealConfirm';
import type { LetterStep } from './flow';

/** Champ de la lettre : posé SUR le papier, donc encre marine (le sous-arbre de `Paper` redéfinit les encres). */
function LetterField({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { colors, fontsLoaded } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      maxLength={20000}
      autoFocus
      accessibilityLabel="La lettre"
      selectionColor={colors.paperSage}
      style={[
        resolveTextStyle('title3', fontsLoaded, undefined, 400),
        { minHeight: 300, color: colors.label, fontSize: 18, lineHeight: 28, textAlignVertical: 'top', padding: 0 },
        NO_FOCUS_RING,
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  step: LetterStep;
  /** « Plus tard » / fermer : rien n'est écrit. */
  onClose: () => void;
  /** « Une lettre à ouvrir le {date} » (renderCaptureLabel). */
  label: string;
  text: string;
  onChange: (t: string) => void;
  /** « Sceller la lettre » : ouvre la confirmation (n'écrit encore rien). */
  onReview: () => void;
  /** Date d'ouverture, un an après le scellement : « 13 octobre 2027 ». */
  openDate: string;
  onSeal: () => void;
  onBack: () => void;
};

/**
 * M15 · Lettre à moi-même (séance 13) sur papier vergé, puis M16 · Sceller dans la MÊME feuille (une seule modale :
 * deux feuilles qui se croisent se bloquent sur iOS). Le contenu suit l'étape du réducteur.
 */
export function LetterView({ visible, step, onClose, label, text, onChange, onReview, openDate, onSeal, onBack }: Props) {
  const writing = step === 'write';
  return (
    <Sheet
      visible={visible}
      onClose={writing ? onClose : step === 'confirm' ? onBack : onClose}
      title="Lettre à moi-même"
      detent="large"
      scroll={false}
      dim={0.46}
      closeLabel={writing ? 'Fermer' : step === 'confirm' ? 'Revenir' : 'Continuer'}
    >
      {writing ? (
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }}>
          <Eyebrow>Séance 13 · À garder</Eyebrow>
          <ThemedText variant="body" style={{ marginTop: 10, fontSize: 17, lineHeight: 25 }}>{label}</ThemedText>
          <Paper laid radius={22} padding={22} style={{ marginTop: 16 }}>
            <LetterField value={text} onChange={onChange} />
          </Paper>
          <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Button variant="accent" label="Sceller la lettre" flex disabled={!text.trim()} onPress={onReview} />
            <Ghost label="Plus tard" onPress={onClose} />
          </View>
        </ScrollView>
      ) : (
        <SealPanel step={step as SealStep} openDate={openDate} onSeal={onSeal} onBack={onBack} onDone={onClose} />
      )}
    </Sheet>
  );
}
