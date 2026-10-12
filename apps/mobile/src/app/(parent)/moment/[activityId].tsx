import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { GlassButton, GlassSurface, SPACING, ThemedText, VignetteImage, useTheme } from '../../../design';
import { MomentClose } from '../../../components/maison/MomentClose';
import { elapsedRatio, formatClock, remainingSeconds } from '../../../components/maison/logic';
import { vignetteIdFor } from '../../../lib/vignettes';
import { getActivity, resolveActivity, type AgeBand, type Duration } from '../../../lib/p3';

// M « Moment en cours » : minuteur plein écran, une étape à la fois. Le chiffre annoncé est
// toujours celui du minuteur. Aucune pression : le temps écoulé ouvre simplement « C’est fait ? ».

const RING = 270;
const STROKE = 16;

function MomentContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
        <GlassButton label="Retour" onPress={() => router.back()} style={{ marginTop: SPACING.space4 }} />
      </View>
    );
  }

  const steps = view.screen_steps?.length ? view.screen_steps : view.steps;
  const total = steps.length;
  const ratio = elapsedRatio(elapsed, minutes);
  const r = (RING - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const showClose = closing || done;

  const topBar = (
    <View style={{ position: 'absolute', top: insets.top + SPACING.space1, left: SPACING.space4, right: SPACING.space4, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: SPACING.space3 }}>
      <GlassButton icon="close" accessibilityLabel="Quitter le moment" onPress={() => router.back()} />
      <ThemedText variant="headline" style={{ color: colors.cream, flex: 1 }} numberOfLines={1}>{activity.title}</ThemedText>
    </View>
  );

  if (showClose) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy900 }}>
        {topBar}
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 72, paddingHorizontal: SPACING.space4 + 4, paddingBottom: SPACING.space8 * 2 }} keyboardShouldPersistTaps="handled">
          <ThemedText variant="displayLarge" accessibilityRole="header" style={{ color: colors.cream }}>C’est fait ?</ThemedText>
          <ThemedText variant="body" style={{ color: colors.cream, opacity: 0.8, marginVertical: SPACING.space3 }}>
            {view.closing}
          </ThemedText>
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900 }}>
      {topBar}
      <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 80 }}>
        <VignetteImage id={vignetteIdFor(activity)} style={{ width: 64, height: 64, borderRadius: 32 }} />
        <ThemedText variant="caption1" style={{ color: colors.cream, opacity: 0.75, marginTop: SPACING.space3, fontWeight: '600', letterSpacing: 1 }}>
          {`ÉTAPE ${step + 1} SUR ${total}`}
        </ThemedText>
        <ThemedText variant="title2" accessibilityLiveRegion="polite" style={{ color: colors.cream, textAlign: 'center', marginTop: SPACING.space2, paddingHorizontal: SPACING.space8 }}>
          {steps[step]}
        </ThemedText>

        <View
          style={{ width: RING, height: RING, marginTop: SPACING.space6 + 1, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={`Il reste ${formatClock(left)} sur ${minutes} minutes`}
        >
          <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.cream} strokeOpacity={0.14} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={RING / 2} cy={RING / 2} r={r} stroke={colors.sun} strokeWidth={STROKE} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - ratio)}
            />
          </Svg>
          <ThemedText variant="numeralHero" style={{ color: colors.cream }}>{formatClock(left)}</ThemedText>
          <ThemedText variant="subheadline" style={{ color: colors.cream, opacity: 0.65, marginTop: 6 }}>{`sur ${minutes} min`}</ThemedText>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.space2, marginTop: SPACING.space8 - 4 }}>
          {steps.map((_, i) => (
            <View key={i} style={{ width: i === step ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? colors.sun : 'rgba(255,255,255,0.25)' }} />
          ))}
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 96, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
        <Pressable
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          accessibilityRole="button"
          accessibilityLabel="Étape précédente"
          style={{ opacity: step === 0 ? 0.4 : 1 }}
        >
          <GlassSurface interactive style={{ width: 64, height: 64 }}>
            <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={26} color={colors.label} />
            </View>
          </GlassSurface>
        </Pressable>
        <Pressable
          onPress={() => setRunning((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Mettre en pause' : 'Reprendre'}
          style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={running ? 'pause' : 'play'} size={34} color={colors.accentInk} />
        </Pressable>
        <Pressable
          onPress={() => (step >= total - 1 ? setClosing(true) : setStep((s) => s + 1))}
          accessibilityRole="button"
          accessibilityLabel={step >= total - 1 ? 'Terminer le moment' : 'Étape suivante'}
        >
          <GlassSurface interactive style={{ width: 64, height: 64 }}>
            <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={step >= total - 1 ? 'checkmark' : 'chevron-forward'} size={26} color={colors.label} />
            </View>
          </GlassSurface>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setClosing(true)}
        accessibilityRole="button"
        accessibilityLabel="Il ne veut plus. On arrête là, c’est compté."
        style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 28, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ThemedText variant="subheadline" style={{ color: colors.cream, opacity: 0.8, textDecorationLine: 'underline' }}>
          Il ne veut plus ? On arrête là, c’est compté.
        </ThemedText>
      </Pressable>
    </View>
  );
}

export default function MomentScreen() {
  return (
    <PremiumGate>
      <MomentContent />
    </PremiumGate>
  );
}
