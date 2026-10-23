import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { Button, SPACING, ThemeScope, ThemedText, useTheme } from '../../../design';
import { useMaisonContext } from '../../../hooks/useMaison';
import { AmorceView } from '../../../components/activite/AmorceView';
import { CarReadView, CarRoadView } from '../../../components/activite/CarView';
import { CheckinView } from '../../../components/activite/CheckinView';
import { ClosingView, MinutesView } from '../../../components/activite/ClosingView';
import { DebriefView } from '../../../components/activite/DebriefView';
import { DerouleView } from '../../../components/activite/DerouleView';
import { EndView, type EndReward } from '../../../components/activite/EndView';
import { KeptSheet } from '../../../components/activite/KeptSheet';
import { LetterView } from '../../../components/activite/LetterView';
import { PlayTimer } from '../../../components/activite/PlayTimer';
import { QuitSheet, SaveFailedSheet } from '../../../components/activite/QuitSheet';
import { RecallView } from '../../../components/activite/RecallView';
import { SynthesisView } from '../../../components/activite/SynthesisView';
import { useNow, type Chrome } from '../../../components/activite/parts';
import { insertMoment, sealLetter } from '../../../components/activite/persist';
import { flowResetKey, useActivityKeepAwake } from '../../../components/activite/visuals/keepAwake';
import { VisualSheet } from '../../../components/activite/visuals/VisualSheet';
import { useVisualNotes } from '../../../components/activite/visuals/useVisualNotes';
import {
  buildMomentPayload, counterSteps, elapsedSeconds, flattenGuide, flowReduce, initialFlow, letterOpensAt, minutesPlayed, parsePlaceChoice,
  playedDuration, prideLine, quitSubtitle, summarizeAfter, type EndSummary, type FlowCtx, type FlowEffect, type FlowEvent, type FlowState,
} from '../../../components/activite/flow';
import { vignetteIdFor } from '../../../lib/vignettes';
import { pushWeekDone } from '../../../components/hub/session';
import {
  PILLAR_PLAIN, PRIDE_LINES, REWARDS, activitiesOfWeek, fill, formatFullDate, getActivity, getWeek, p3Pool, recallLine, renderCaptureLabel,
  resolveActivity, type AgeBand, type Duration, type Moment, type P3Activity, type StepTimer, type VisualId,
} from '../../../lib/p3';

// M1…M17 · Mode activité. Un flot d'écrans où CHAQUE TAP AJOUTE le contenu suivant en dessous, un pas à la fois, jamais
// automatiquement (logique pure et testée : components/activite/flow.ts). Toujours sur le fond marine de Veillée, quel
// que soit le style choisi (<ThemeScope style="veillee" fill>). La route ne fait que brancher les données (enfant,
// moments vécus, lieu) et exécuter les effets du réducteur : enregistrer le moment, sceller la lettre, sortir.
// E1 : l'écran reste allumé tant que la route est ouverte (expo-keep-awake, relâché à la sortie). MV / VI1–VI8 : les supports
// visuels (« Montrer : … ») s'ouvrent en feuille plein écran par-dessus le déroulé ou le débrief.

type FlowProps = {
  activity: P3Activity;
  duration: Duration;
  childId: string;
  band: AgeBand;
  place: ReturnType<typeof parsePlaceChoice>;
};

function ActivityFlow({ activity, duration, childId, band, place }: FlowProps) {
  const router = useRouter();
  const { reduceMotion } = useTheme();
  useActivityKeepAwake();
  const { child, moments, doneIds, reload, childrenLoading, isLoading } = useMaisonContext(childId);
  const view = useMemo(() => resolveActivity(activity, duration, band)!, [activity, duration, band]);
  const firstName = child?.first_name ?? 'votre enfant';
  const week = getWeek(activity.week);
  const isLetter = activity.capture?.kind === 'lettre';
  const lastKept = moments.find((m) => m.kept_phrase?.trim())?.kept_phrase?.trim() ?? null;
  const recall = recallLine(firstName, lastKept);
  // La phrase d'ouverture de la semaine ne s'affiche qu'avant sa première fiche cœur.
  const opening = activity.programme === 'coeur' && activity.rank === 1 && week ? week.opening_line : null;
  const flat = useMemo(() => flattenGuide(activity.guide), [activity.guide]);

  const ctx = useMemo<FlowCtx>(
    () => ({
      inCar: place === 'voiture',
      hasRecall: !!(recall || opening),
      flatLength: flat.length,
      debriefLength: view.debrief.length,
      baseDuration: view.duration,
      extensions: activity.extensions,
      isLetter,
    }),
    [place, recall, opening, flat.length, view.debrief.length, view.duration, activity.extensions, isLetter],
  );

  const [state, setState] = useState<FlowState>(initialFlow);
  const stateRef = useRef(state);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const [summary, setSummary] = useState<EndSummary | null>(null);
  const [shownCount, setShownCount] = useState<number | null>(null);
  const [rewardsHidden, setRewardsHidden] = useState(false);
  const [playTimer, setPlayTimer] = useState<StepTimer | null>(null);
  const [visual, setVisual] = useState<VisualId | null>(null);
  const visualNotes = useVisualNotes(childId, visual === 'outils');
  const [boostFlash, setBoostFlash] = useState(false);
  // On n'attend le chargement des moments qu'une seule fois : un rechargement après l'enregistrement ne doit pas masquer la fin.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!childrenLoading && !isLoading) setReady(true);
  }, [childrenLoading, isLoading]);

  const runEffect = useRef<(e: FlowEffect) => void>(() => undefined);
  const dispatch = useCallback((e: FlowEvent) => {
    const r = flowReduce(stateRef.current, e, ctxRef.current);
    stateRef.current = r.state;
    setState(r.state);
    r.effects.forEach((fx) => runEffect.current(fx));
  }, []);

  runEffect.current = (fx) => {
    if (fx.type === 'exit') {
      if (fx.to === 'fiche') router.back();
      else router.replace('/(parent)/maison');
      return;
    }
    if (fx.type === 'seal-letter') {
      sealLetter(childId, fx.body).then(
        (at) => dispatch({ t: 'letter.sealed', at }),
        () => dispatch({ t: 'letter.failed' }),
      );
      return;
    }
    // record
    const s = stateRef.current;
    const now = Date.now();
    const payload = buildMomentPayload(s, { activity, debrief: view.debrief, baseDuration: view.duration, place, skipped: fx.skipped, now });
    const sealed = s.letter.sealedAt;
    insertMoment(childId, payload, { sealedAt: sealed !== null ? new Date(sealed).toISOString() : null }).then(
      () => {
        const after: Moment = { activity_id: activity.id, created_at: new Date(now).toISOString(), duration_chosen: payload.duration_chosen, rating: payload.rating };
        const sum = summarizeAfter({ before: moments, after, activity, now: new Date(now), skipped: fx.skipped, rating: s.rating, outcome: s.outcome, kept: s.kept });
        setSummary(sum);
        // L'accueil Maison (copie du web) affichera « Semaine N complète. » à son retour.
        if (sum.weekJustDone && activity.week !== null) pushWeekDone(childId, activity.week);
        dispatch({ t: 'record.done' });
        void reload();
      },
      () => dispatch({ t: 'record.failed' }),
    );
  };

  // Android : le bouton retour ouvre « Enregistrer ce moment ? » au lieu de quitter d'un coup.
  // Lié au FOCUS (le moment est un onglet : le quitter ne le démonte pas) — sinon un moment caché capterait le retour d'ailleurs.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        dispatch({ t: 'quit.request' });
        return true;
      });
      return () => sub.remove();
    }, [dispatch]),
  );

  // Le temps ne tourne que pendant l'activité (jamais avant « C'est dit, on commence », jamais après « Terminer »).
  const running = state.startedAt !== null && state.endedAt === null;
  const now = useNow(running || state.quitAsk);
  const elapsedS = elapsedSeconds(state.startedAt, state.endedAt, now);
  const totalS = playedDuration(view.duration, state.ext.extraMinutes) * 60;

  useEffect(() => {
    if (state.ext.boost === 0) return;
    setBoostFlash(true);
    const id = setTimeout(() => setBoostFlash(false), 2400);
    return () => clearTimeout(id);
  }, [state.ext.boost]);

  // Compteur qui monte (≤ 2 s) si le parent a répondu ; sinon affiché directement.
  useEffect(() => {
    if (!summary) return;
    const steps = counterSteps(summary.countBefore, summary.count);
    if (!summary.answered || reduceMotion || steps.length < 2) {
      setShownCount(summary.count);
      return;
    }
    let i = 0;
    setShownCount(steps[0]);
    const id = setInterval(() => {
      i += 1;
      setShownCount(steps[Math.min(i, steps.length - 1)]);
      if (i >= steps.length - 1) clearInterval(id);
    }, 600);
    return () => clearInterval(id);
  }, [summary, reduceMotion]);

  const onMinutesElapsed = useCallback(() => dispatch({ t: 'minutes.elapsed' }), [dispatch]);

  const chrome: Chrome = {
    title: activity.title,
    onClose: () => dispatch({ t: 'quit.request' }),
    timer: state.screen === 'deroule' && running ? { elapsedS, totalS, tone: 'sage', boostLabel: boostFlash ? '+10 min' : null } : null,
  };

  if (!ready) {
    return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  }

  const captureLabel = activity.capture
    ? isLetter
      ? renderCaptureLabel(activity.capture.label, new Date())
      : activity.capture.label
    : null;
  const sealedAt = state.letter.sealedAt;
  const letterOpenDate = formatFullDate(letterOpensAt(sealedAt ?? Date.now()));

  let body: React.ReactNode = null;
  switch (state.screen) {
    case 'checkin':
      body = (
        <CheckinView
          chrome={chrome}
          answers={state.checkin}
          onAnswer={(axis, option) => dispatch({ t: 'checkin.answer', axis, option })}
          onContinue={() => dispatch({ t: 'checkin.leave' })}
          onSkip={() => dispatch({ t: 'checkin.leave' })}
        />
      );
      break;
    case 'rappel':
      body = (
        <RecallView
          chrome={chrome}
          opening={opening && week ? { weekLabel: `Semaine ${week.week} · ${week.title}`, line: opening } : null}
          recall={recall}
          onContinue={() => dispatch({ t: 'rappel.next' })}
        />
      );
      break;
    case 'lecture':
      body = (
        <CarReadView
          chrome={chrome}
          opener={view.opener}
          steps={view.screen_steps}
          says={activity.guide.map((g) => g.beats.filter((b) => b.kind === 'dire').map((b) => b.text))}
          onRead={() => dispatch({ t: 'lecture.read' })}
        />
      );
      break;
    case 'amorce':
      body = (
        <AmorceView
          chrome={chrome}
          vignetteId={vignetteIdFor(activity)}
          vignetteLabel={activity.title}
          worked={{
            skill: week?.skill ?? activity.subtitle,
            objective: activity.objective,
            tail: activity.subtitle.includes(PILLAR_PLAIN[activity.pillar_main])
              ? activity.subtitle
              : `${activity.subtitle} · ${PILLAR_PLAIN[activity.pillar_main]}`,
          }}
          safety={activity.safety}
          opener={view.opener}
          minutes={view.duration}
          onStart={() => dispatch({ t: 'activity.start', now: Date.now() })}
        />
      );
      break;
    case 'deroule':
      body = (
        <DerouleView
          chrome={chrome}
          steps={view.screen_steps}
          guide={activity.guide}
          flat={flat}
          revealed={state.revealed}
          extensions={activity.extensions}
          ext={state.ext}
          baseDuration={view.duration}
          noteLabel={activity.capture ? (isLetter ? 'La lettre' : 'Noter') : null}
          onNext={() => dispatch({ t: 'beat.next' })}
          onPrev={() => dispatch({ t: 'beat.prev' })}
          onFinish={() => dispatch({ t: 'activity.finish', now: Date.now() })}
          onNote={() => dispatch({ t: 'note.open' })}
          onOpenExt={(index) => dispatch({ t: 'ext.open', index })}
          onLaunchTimer={setPlayTimer}
          onShowVisual={setVisual}
        />
      );
      break;
    case 'route':
      body = <CarRoadView chrome={chrome} elapsedS={elapsedS} totalS={totalS} onFinish={() => dispatch({ t: 'activity.finish', now: Date.now() })} />;
      break;
    case 'debrief':
      body = (
        <DebriefView
          chrome={chrome}
          questions={view.debrief}
          shown={state.debriefShown}
          answers={state.debriefAnswers}
          week1={activity.week === 1}
          onAnswer={(index, text) => dispatch({ t: 'debrief.answer', index, text })}
          onNext={() => dispatch({ t: 'debrief.next' })}
          visuals={activity.visuals}
          onShowVisual={setVisual}
        />
      );
      break;
    case 'cloture':
      body = <ClosingView chrome={chrome} closing={view.closing} onDone={() => dispatch({ t: 'cloture.done' })} />;
      break;
    case 'minutes':
      body = <MinutesView chrome={chrome} minutes={minutesPlayed(elapsedS)} firstName={firstName} onElapsed={onMinutesElapsed} />;
      break;
    case 'synthese':
      body = (
        <SynthesisView
          chrome={chrome}
          rating={state.rating}
          outcome={state.outcome}
          kept={state.kept}
          saving={state.recording}
          onRating={(rating) => dispatch({ t: 'synthese.rating', rating })}
          onOutcome={(outcome) => dispatch({ t: 'synthese.outcome', outcome })}
          onKept={(text) => dispatch({ t: 'synthese.kept', text })}
          onSave={(skipped) => dispatch({ t: 'synthese.save', skipped })}
        />
      );
      break;
    case 'fin': {
      const rewards: EndReward[] = rewardsHidden
        ? []
        : (summary?.newRewards ?? [])
            .map((id) => REWARDS.find((r) => r.id === id))
            .filter((r): r is NonNullable<typeof r> => !!r && r.available)
            .map((r) => ({ id: r.id, label: fill(r.label, { prenom: firstName }) }));
      const doneAfter = new Set([...doneIds, activity.id]);
      const next =
        activity.week === null
          ? null
          : activitiesOfWeek(activity.week, p3Pool()).filter((a) => a.age_bands.includes(band)).find((a) => !doneAfter.has(a.id)) ?? null;
      body = (
        <EndView
          chrome={chrome}
          firstName={firstName}
          count={shownCount ?? summary?.count ?? 0}
          weekStars={summary?.weekStars ?? 0}
          pride={prideLine(summary?.prideKey ?? 'done')}
          low={summary?.low ? { text: activity.why_it_fails, reassurance: PRIDE_LINES.notReally } : null}
          sealedLine={
            isLetter && sealedAt ? `Lettre scellée. Elle te reviendra par courriel le ${formatFullDate(letterOpensAt(sealedAt))}.` : null
          }
          rewards={rewards}
          weekCompleteLabel={summary?.weekJustDone ? `Semaine ${activity.week} complète.` : null}
          next={next ? { title: next.title } : null}
          onViewReward={(rewardId) => router.push({ pathname: '/(parent)/objet/[rewardId]', params: { rewardId, childId } })}
          onLaterRewards={() => setRewardsHidden(true)}
          onNext={() => {
            if (next) router.replace({ pathname: '/(parent)/activite/[activityId]', params: { activityId: next.id, childId, band } });
          }}
          onHome={() => router.replace('/(parent)/maison')}
        />
      );
      break;
    }
  }

  return (
    <>
      {body}
      {activity.capture && !isLetter ? (
        <KeptSheet
          visible={state.noteOpen}
          onClose={() => dispatch({ t: 'note.close' })}
          label={captureLabel ?? ''}
          kind={activity.capture.kind}
          items={state.captureItems}
          text={state.captureText}
          onItems={(items) => dispatch({ t: 'note.items', items })}
          onText={(text) => dispatch({ t: 'note.text', text })}
        />
      ) : null}
      {isLetter ? (
        <LetterView
          visible={state.noteOpen}
          step={state.letter.step}
          onClose={() => dispatch({ t: 'note.close' })}
          label={captureLabel ?? ''}
          text={state.letter.text}
          onChange={(text) => dispatch({ t: 'letter.edit', text })}
          onReview={() => dispatch({ t: 'letter.review' })}
          openDate={letterOpenDate}
          onSeal={() => dispatch({ t: 'letter.seal' })}
          onBack={() => dispatch({ t: 'letter.back' })}
        />
      ) : null}
      <VisualSheet id={visual} notes={visualNotes} onClose={() => setVisual(null)} />
      {playTimer ? <PlayTimer timer={playTimer} onClose={() => setPlayTimer(null)} /> : null}
      <SaveFailedSheet visible={state.saveFailed} onRetry={() => dispatch({ t: 'record.retry' })} onLeave={() => dispatch({ t: 'record.leave' })} />
      <QuitSheet
        visible={state.quitAsk}
        subtitle={quitSubtitle(minutesPlayed(elapsedS), firstName)}
        letterSealed={sealedAt !== null}
        onYes={() => dispatch({ t: 'quit.answer', answer: 'oui', now: Date.now() })}
        onNo={() => dispatch({ t: 'quit.answer', answer: 'non', now: Date.now() })}
        onCancel={() => dispatch({ t: 'quit.cancel' })}
      />
    </>
  );
}

function MomentContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { activityId, childId, band, duration, lieu } = useLocalSearchParams<{
    activityId: string; childId: string; band: AgeBand; duration?: string; lieu?: string;
  }>();
  const activity = getActivity(activityId ?? '');
  const declared = (Number(duration) || activity?.base_duration || 10) as Duration;
  const view = activity && band ? resolveActivity(activity, declared, band) : null;

  // Le moment est un onglet : il reste monté quand on le quitte. Chaque retour de focus après une sortie est une NOUVELLE entrée
  // (le flot repart de zéro) ; un changement de paramètres (autre fiche, autre enfant, autre lieu) l'est aussi.
  const [entry, setEntry] = useState(0);
  const left = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (left.current) {
        left.current = false;
        setEntry((n) => n + 1);
      }
      return () => {
        left.current = true;
      };
    }, []),
  );

  if (!activity || !view || !childId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.space6, backgroundColor: colors.bgGrouped }} accessibilityRole="alert">
        <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>Cette activité n’est pas disponible.</ThemedText>
        <Button variant="gray" size="md" label="Retour" onPress={() => router.back()} style={{ marginTop: SPACING.space4 }} />
      </View>
    );
  }

  // Le mode activité est TOUJOURS sur le fond marine de Veillée, même si le parent a choisi Lin.
  return (
    <ThemeScope style="veillee" fill>
      <ActivityFlow key={flowResetKey(entry, [activityId, childId, band, duration, lieu])} activity={activity} duration={view.duration} childId={childId} band={band} place={parsePlaceChoice(lieu)} />
    </ThemeScope>
  );
}

export default function MomentScreen() {
  return (
    <PremiumGate>
      <MomentContent />
    </PremiumGate>
  );
}
