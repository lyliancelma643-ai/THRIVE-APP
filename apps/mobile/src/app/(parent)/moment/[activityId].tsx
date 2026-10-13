import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { Button, CANVAS, SPACING, ThemedText, useTheme } from '../../../design';
import { MomentClose } from '../../../components/maison/MomentClose';
import { MomentView } from '../../../components/maison/MomentView';
import { MOMENT_BACKGROUND, momentInk } from '../../../components/maison/palette';
import { elapsedRatio, formatClock, remainingSeconds } from '../../../components/maison/logic';
import { buildMomentVM } from '../../../components/maison/models';
import { vignetteIdFor } from '../../../lib/vignettes';
import { getActivity, resolveActivity, type AgeBand, type Duration } from '../../../lib/p3';

// M « Moment en cours » : minuteur plein écran, une étape à la fois. Le chiffre annoncé est toujours celui du minuteur.
// Aucune pression : le temps écoulé ouvre simplement « C’est fait ? ». « Arrêter » compte quand même.
// Le rendu vit dans MomentView ; la route porte le temps, l'étape et l'enregistrement.

function MomentContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, style } = useTheme();
  const { activityId, childId, band, duration } = useLocalSearchParams<{
    activityId: string; childId: string; band: AgeBand; duration?: string;
  }>();
  const activity = getActivity(activityId ?? '');
  const declared = (Number(duration) || activity?.base_duration || 10) as Duration;
  const view = activity && band ? resolveActivity(activity, declared, band) : null;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!running || closing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      setElapsed((e) => e + (now - last));
      last = now;
    }, 250);
    return () => clearInterval(id);
  }, [running, closing]);

  const minutes = view?.duration ?? declared;
  const left = remainingSeconds(elapsed, minutes);
  const done = !!view && left === 0;

  if (!activity || !view || activity.week === null || !childId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.space6, backgroundColor: colors.bgGrouped }} accessibilityRole="alert">
        <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>Cette activité n’est pas disponible.</ThemedText>
        <Button variant="gray" size="md" label="Retour" onPress={() => router.back()} style={{ marginTop: SPACING.space4 }} />
      </View>
    );
  }

  const steps = view.screen_steps?.length ? view.screen_steps : view.steps;
  const total = steps.length;
  const showClose = closing || done;

  if (showClose) {
    return (
      <View style={{ flex: 1, backgroundColor: MOMENT_BACKGROUND[style] }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 72, paddingHorizontal: SPACING.space4 + 4, paddingBottom: SPACING.space8 * 2 }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText variant="largetitle" accessibilityRole="header" style={{ color: CANVAS.white }}>C’est fait ?</ThemedText>
          <ThemedText variant="body" style={{ color: momentInk(0.8), marginVertical: SPACING.space3 }}>{view.closing}</ThemedText>
          <View style={{ backgroundColor: colors.bgGrouped, borderRadius: 26, padding: SPACING.space4 }}>
            <MomentClose
              activity={activity}
              childId={childId}
              duration={view.duration}
              onSaved={() => router.replace('/(parent)/maison')}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  const vm = buildMomentVM({
    title: activity.title,
    vignetteId: vignetteIdFor(activity),
    steps,
    step,
    clock: formatClock(left),
    minutes,
    ratio: elapsedRatio(elapsed, minutes),
    running,
  });

  return (
    <MomentView
      vm={vm}
      onClose={() => router.back()}
      onPrev={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => (step >= total - 1 ? setClosing(true) : setStep((s) => s + 1))}
      onToggle={() => setRunning((v) => !v)}
      onStop={() => setClosing(true)}
    />
  );
}

export default function MomentScreen() {
  return (
    <PremiumGate>
      <MomentContent />
    </PremiumGate>
  );
}
