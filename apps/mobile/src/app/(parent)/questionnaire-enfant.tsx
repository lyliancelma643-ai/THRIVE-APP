import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabaseClient as supabase } from '@thrive/shared';
import { ThemedText, useTheme } from '../../design';
import QuestionsScreen from '../../screens/child/QuestionsScreen';
import { epochPalette } from '../../screens/child/palette';
import {
  COPY, SCALES, allAnswered, answeredCount, loadErrorKey, nextIndex, orderItems, outcomeMessage, submitErrorMessage,
  type Answers, type QuestionnaireLang, type QuestionnaireLoad,
} from '../../components/questionnaire/questionnaireEnfant';

// W · Questionnaire de l'enfant (EPOCH ou LSSS) : le lien à jeton du web (`/q/[token]`) en natif. L'enfant n'a ni compte ni
// mot de passe : le jeton (?token=…) suffit, les deux RPC SECURITY DEFINER lisent et enregistrent. Le verrou « 1 test par
// séance » reste côté serveur (migrations 047/053) : un questionnaire déjà complété s'affiche comme tel. Aucune question
// ni donnée d'exemple ici, tout vient de `questionnaire_get`.

const ADVANCE_MS = 260;

export default function QuestionnaireEnfantScreen() {
  const router = useRouter();
  const { styleKey } = useTheme();
  const p = epochPalette(styleKey);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<QuestionnaireLoad | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [uiLang, setUiLang] = useState<QuestionnaireLang | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState({ error: 'invalid' });
      return;
    }
    const { data, error, status } = await supabase.rpc('questionnaire_get', { p_token: token });
    if (error) {
      setState({ error: loadErrorKey(status) });
      return;
    }
    setState(data as QuestionnaireLoad);
  }, [token]);

  useEffect(() => {
    void load();
    return () => {
      if (advance.current) clearTimeout(advance.current);
    };
  }, [load]);

  const items = useMemo(() => orderItems(state?.items), [state]);
  const total = items.length;
  const answered = answeredCount(items, answers);
  const complete = allAnswered(items, answers);
  const lang: QuestionnaireLang = uiLang ?? (state?.lang === 'en' ? 'en' : 'fr');
  const c = COPY[lang];
  const kind = state?.kind === 'PERMA' ? 'PERMA' : 'LSSS';

  const choose = (itemId: string, v: number) => {
    const next = { ...answers, [itemId]: v };
    setAnswers(next);
    if (advance.current) clearTimeout(advance.current);
    // Un court temps pour voir son choix, puis la question suivante sans réponse.
    advance.current = setTimeout(() => setIndex((i) => nextIndex(items, next, i, itemId)), ADVANCE_MS);
  };

  const submit = async () => {
    if (!token || !complete || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const { data, error, status } = await supabase.rpc('questionnaire_submit', { p_token: token, p_answers: answers });
    setSubmitting(false);
    if (error) {
      setSubmitError(submitErrorMessage(c, { status }));
      return;
    }
    const code = (data as { error?: string } | null)?.error ?? null;
    if (code) {
      setSubmitError(submitErrorMessage(c, { code }));
      return;
    }
    setDone(true);
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/(parent)/bilans'));

  if (!state) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }} accessibilityRole="progressbar" accessibilityLabel={COPY.fr.loading}>
        <ActivityIndicator color={p.accent} />
      </View>
    );
  }

  if (state.error || done || state.completed) {
    const o = outcomeMessage(c, { done, completed: state.completed, error: state.error });
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: p.bg }}>
        <ThemedText variant="title2" weight={700} accessibilityRole="header" style={{ color: p.ink, textAlign: 'center' }}>{o.ok ? c.done : c.oops}</ThemedText>
        <ThemedText variant="body" style={{ color: p.ink, textAlign: 'center', marginTop: 10, opacity: 0.85 }}>{o.message}</ThemedText>
        <Pressable
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel={c.home}
          style={{ marginTop: 28, minHeight: 52, paddingHorizontal: 28, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accent }}
        >
          <ThemedText variant="headline" style={{ color: p.selectedInk }}>{c.home}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const atEnd = index >= total;
  const item = atEnd ? null : items[index];
  const footer = (
    <View style={{ gap: 10 }}>
      {submitError ? <ThemedText variant="sub" accessibilityRole="alert" style={{ color: p.ink, textAlign: 'center' }}>{submitError}</ThemedText> : null}
      {atEnd ? (
        <>
          <ThemedText variant="callout" weight={600} style={{ color: p.ink, textAlign: 'center' }}>{complete ? c.review : c.remaining(total - answered)}</ThemedText>
          <Pressable
            onPress={submit}
            disabled={!complete || submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: !complete || submitting }}
            style={{ minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accent, opacity: complete ? 1 : 0.45 }}
          >
            <ThemedText variant="headline" style={{ color: p.selectedInk }}>{submitting ? c.sending : c.send}</ThemedText>
          </Pressable>
        </>
      ) : null}
      {index > 0 ? (
        <Pressable onPress={() => setIndex((i) => Math.max(0, i - 1))} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText variant="callout" weight={600} style={{ color: p.ink }}>{c.prev}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <QuestionsScreen
      firstName={state.child_first_name}
      lang={lang}
      onLangChange={setUiLang}
      dimension={item?.group_label}
      question={item?.prompt}
      index={Math.min(index + 1, Math.max(total, 1))}
      total={Math.max(total, 1)}
      selected={item ? answers[item.id] ?? null : null}
      onAnswer={item ? (v) => choose(item.id, v) : undefined}
      scale={SCALES[kind][lang]}
      footer={footer}
    />
  );
}
