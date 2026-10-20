import { Pressable, View } from 'react-native';
import { Button, ThemedText, useTheme } from '../../design';
import { CHECKIN } from '../../lib/p3';
import { CHECKIN_AXES, canContinueCheckin, frTypo, shownAxisCount, type CheckinAnswers } from './flow';
import { CheckinGlyph } from './Glyph';
import { Display, Eyebrow, Frame, Ghost, type Chrome } from './parts';

type Props = {
  chrome: Chrome;
  answers: CheckinAnswers;
  onAnswer: (axisId: string, optionId: string) => void;
  /** « Continuer » (trois réponses) : quitte le check-in. */
  onContinue: () => void;
  /** « Passer » : toujours possible, à chaque question. */
  onSkip: () => void;
};

/**
 * M1 · Check-in : trois questions, UNE À LA FOIS (la suivante s'ajoute en dessous après une réponse), pictogrammes
 * dessinés, pastille crème choisie. Jamais de chiffre. « Passer » reste visible à chaque question.
 */
export function CheckinView({ chrome, answers, onAnswer, onContinue, onSkip }: Props) {
  const { colors } = useTheme();
  const shown = CHECKIN_AXES.slice(0, shownAxisCount(answers));
  const complete = canContinueCheckin(answers);
  return (
    <Frame
      chrome={chrome}
      revealKey={shown.length}
      cta={
        <>
          <Button variant={complete ? 'accent' : 'gray'} label="Continuer" flex disabled={!complete} onPress={onContinue} style={complete ? undefined : { opacity: 0.55 }} />
          <Ghost label={CHECKIN.skip} onPress={onSkip} accessibilityLabel="Passer le check-in" />
        </>
      }
    >
      <Eyebrow>Check-in</Eyebrow>
      <ThemedText variant="body" color="label2" style={{ marginTop: 12 }}>{CHECKIN.intro}</ThemedText>
      <View style={{ marginTop: 26, gap: 26 }}>
        {shown.map((axis) => (
          <View key={axis.id} accessibilityRole="radiogroup">
            <Display size={21} lineHeight={27} style={{ marginBottom: 12 }}>{frTypo(axis.question)}</Display>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {axis.options.map((o) => {
                const on = answers[axis.id] === o.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => onAnswer(axis.id, o.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={o.label}
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => ({
                      minHeight: 52, paddingLeft: 12, paddingRight: 18, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 9,
                      backgroundColor: on ? colors.cream : colors.fill4,
                      borderWidth: on ? 0 : 1, borderColor: colors.separator, opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <CheckinGlyph id={o.id === 'ok' ? 'calme' : o.id} />
                    <ThemedText variant="body" weight={500} style={{ color: on ? colors.navy900 : colors.label }}>{o.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </Frame>
  );
}
