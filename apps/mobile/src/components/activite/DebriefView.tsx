import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Button, ThemedText, resolveTextStyle, useTheme } from '../../design';
import { DEBRIEF, type VisualId } from '../../lib/p3';
import { frTypo } from './flow';
import { Display, Eyebrow, Frame, Ghost, NO_FOCUS_RING, type Chrome } from './parts';
import { VisualButton } from './visuals/VisualButton';

type Question = { kind: keyof typeof DEBRIEF.labels; question: string };

type Props = {
  chrome: Chrome;
  questions: Question[];
  /** Nombre de questions déjà posées : « Question suivante » en ajoute UNE en dessous. */
  shown: number;
  answers: Record<number, string>;
  /** Semaine 1 : la Méthode garde cette semaine pour la relation (pas de question « où ailleurs »). */
  week1: boolean;
  onAnswer: (index: number, text: string) => void;
  /** « Question suivante » / « Continuer » / « Passer » : la même progression. */
  onNext: () => void;
  /** MV : les visuels de la fiche (`activity.visuals`), montrés sous les questions. */
  visuals?: VisualId[];
  onShowVisual?: (id: VisualId) => void;
};

/** M8 · Débrief : les questions s'ajoutent l'une sous l'autre, une à la fois ; réponse d'un tap (facultative). */
export function DebriefView({ chrome, questions, shown, answers, week1, onAnswer, onNext, visuals = [], onShowVisual }: Props) {
  const { colors, fontsLoaded } = useTheme();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const last = shown >= questions.length;
  return (
    <Frame
      chrome={chrome}
      revealKey={shown}
      cta={
        <>
          <Button variant="accent" label={last ? 'Continuer' : 'Question suivante'} flex onPress={onNext} />
          <Ghost label="Passer" onPress={onNext} accessibilityLabel="Passer cette question" />
        </>
      }
    >
      <ThemedText variant="callout" color="label2" style={{ marginBottom: 26 }}>{DEBRIEF.intro}</ThemedText>
      <View style={{ gap: 34 }}>
        {questions.slice(0, shown).map((q, i) => {
          const current = i === shown - 1;
          const answered = open[i] || !!answers[i];
          return (
            <View key={i} style={{ opacity: current ? 1 : 0.6 }}>
              <Eyebrow>{`Question ${i + 1} sur ${questions.length} · ${DEBRIEF.labels[q.kind]}`}</Eyebrow>
              <Display size={current ? 30 : 21} lineHeight={current ? 37 : 27} style={{ marginTop: 12 }}>{frTypo(q.question)}</Display>
              {answered ? (
                <TextInput
                  value={answers[i] ?? ''}
                  onChangeText={(t) => onAnswer(i, t)}
                  multiline
                  maxLength={500}
                  autoFocus={current}
                  accessibilityLabel="Sa réponse"
                  placeholder="Sa réponse, dans ses mots"
                  placeholderTextColor={colors.label3}
                  selectionColor={colors.tintText}
                  style={[
                    resolveTextStyle('body', fontsLoaded),
                    { marginTop: 14, minHeight: 64, padding: 14, borderRadius: 20, color: colors.label, backgroundColor: colors.fill4, borderWidth: 1, borderColor: colors.separator, textAlignVertical: 'top' },
                    NO_FOCUS_RING,
                  ]}
                />
              ) : (
                <Pressable
                  onPress={() => setOpen((o) => ({ ...o, [i]: true }))}
                  accessibilityRole="button"
                  style={{ marginTop: 14, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
                >
                  <ThemedText variant="callout" weight={600} color="tintText" style={{ textDecorationLine: 'underline' }}>Noter sa réponse</ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
      {last && week1 ? <ThemedText variant="sub" color="label2" style={{ marginTop: 24 }}>{DEBRIEF.week1Note}</ThemedText> : null}
      {onShowVisual && visuals.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          {visuals.map((v) => <VisualButton key={v} id={v} onOpen={onShowVisual} />)}
        </View>
      ) : null}
    </Frame>
  );
}
