import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import {
  GlassButton, GlassSurface, ListGroup, ListRow, RADIUS, SPACING, Sheet, ThemedText, VignetteImage, useTheme,
} from '../../../design';
import { MomentClose } from '../../../components/maison/MomentClose';
import { ScreenBar } from '../../../components/maison/ScreenBar';
import { materialsLabel } from '../../../components/maison/helpers';
import { vignetteIdFor, vignetteLabel } from '../../../lib/vignettes';
import { getActivity, resolveActivity, type AgeBand, type Duration } from '../../../lib/p3';

// L « Fiche moment » : vignette, objectif, durée, ce qu’on dit pour commencer, les étapes,
// puis la barre « Pas ce soir / Commencer ». « C’est fait ? » reste en bas de page pour noter
// un moment vécu sans minuteur.

const GUTTER = SPACING.space4 + 4;

function ActivityContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { activityId, childId, band } = useLocalSearchParams<{ activityId: string; childId: string; band: AgeBand }>();
  const activity = getActivity(activityId ?? '');
  const durations = (activity?.durations ?? [10]) as Duration[];
  const [duration, setDuration] = useState<Duration>(durations[0]);
  const [whyOpen, setWhyOpen] = useState(false);

  const view = activity && band ? resolveActivity(activity, duration, band) : null;

  // childId absent (lien profond incomplet) : on ne peut rien enregistrer → écran « indisponible ».
  if (!activity || !view || activity.week === null || !childId) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.space6, backgroundColor: colors.bgGrouped }}
        accessibilityRole="alert"
      >
        <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>Cette activité n’est pas disponible.</ThemedText>
        <GlassButton label="Retour" onPress={() => router.back()} style={{ marginTop: SPACING.space4 }} />
      </View>
    );
  }

  const steps = view.screen_steps?.length ? view.screen_steps : view.steps;
  const heroH = 340;
  const card = { backgroundColor: colors.bgGrouped2, borderRadius: RADIUS.card, padding: SPACING.space4 + 1 } as const;
  const start = () =>
    router.push({
      pathname: '/(parent)/moment/[activityId]',
      params: { activityId: activity.id, childId, band: band!, duration: String(view.duration) },
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        <View style={{ height: heroH, backgroundColor: colors.bgGrouped3, overflow: 'hidden' }}>
          <VignetteImage
            id={vignetteIdFor(activity)}
            accessibilityLabel={vignetteLabel(activity)}
            style={{ position: 'absolute', left: (width - 300) / 2, top: insets.top + 44, width: 300, height: 296 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(2,37,57,0)', 'rgba(2,37,57,0.88)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}
          />
          <View style={{ position: 'absolute', left: GUTTER, right: GUTTER, bottom: SPACING.space4 + 2 }}>
            <ThemedText variant="caption1" style={{ color: colors.cream, opacity: 0.9, fontWeight: '600', letterSpacing: 1 }}>
              {`SEMAINE ${activity.week} · MOMENT ${activity.rank}`}
            </ThemedText>
            <ThemedText variant="displayLarge" accessibilityRole="header" style={{ color: colors.cream, fontSize: 30, lineHeight: 34 }}>
              {view.title}
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="callout" color="label2" style={{ marginHorizontal: GUTTER, marginTop: SPACING.space4 }}>
          {`Objectif : ${view.objective}`}
        </ThemedText>

        {durations.length > 1 ? (
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: 'row', marginHorizontal: GUTTER, marginTop: SPACING.space4, padding: 3, borderRadius: 12, backgroundColor: colors.fill3 }}
          >
            {durations.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                accessibilityRole="radio"
                accessibilityLabel={`${d} minutes`}
                accessibilityState={{ selected: d === view.duration }}
                style={{
                  flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: d === view.duration ? colors.bgGrouped2 : 'transparent',
                }}
              >
                <ThemedText variant="subheadline" style={{ fontWeight: d === view.duration ? '600' : '400' }}>{`${d} min`}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[card, { marginHorizontal: GUTTER, marginTop: SPACING.space4 }]}>
          <ThemedText variant="footnote" color="label2" style={{ fontWeight: '600' }}>Ce que tu dis pour commencer</ThemedText>
          <ThemedText variant="displayQuote" style={{ marginTop: SPACING.space2 }}>{`« ${view.opener} »`}</ThemedText>
        </View>

        <ThemedText variant="title3" accessibilityRole="header" style={{ marginHorizontal: GUTTER, marginTop: SPACING.space6, marginBottom: SPACING.space3 }}>
          Ce que tu vas faire
        </ThemedText>
        <ListGroup>
          {steps.map((s, i) => (
            <View
              key={i}
              accessible
              accessibilityLabel={`Étape ${i + 1} : ${s}`}
              style={{ minHeight: SPACING.rowMin, flexDirection: 'row', alignItems: 'center', gap: SPACING.space3, padding: SPACING.space3 }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
                <ThemedText variant="subheadline" style={{ fontWeight: '700' }}>{i + 1}</ThemedText>
              </View>
              <ThemedText variant="body" style={{ flex: 1 }}>{s}</ThemedText>
            </View>
          ))}
          {view.extensions.map((e, i) => (
            <View key={`x${i}`} style={{ padding: SPACING.space3 }}>
              <ThemedText variant="subheadline" color="label2">{`+ ${e.text}`}</ThemedText>
            </View>
          ))}
        </ListGroup>

        <View style={{ marginTop: SPACING.space3 }}>
          <ListGroup>
            <ListRow icon="cube-outline" iconColor="sysTeal" title="À prévoir" subtitle={materialsLabel(activity)} chevron={false} />
            {view.variant ? <ListRow icon="person-outline" iconColor="sysIndigo" title="À cet âge" subtitle={view.variant} chevron={false} /> : null}
            <ListRow
              icon="leaf-outline"
              iconColor="sysGreen"
              title="Pourquoi ça marche"
              subtitle={activity.why_one_line}
              last
              onPress={() => setWhyOpen(true)}
            />
          </ListGroup>
        </View>

        <ThemedText variant="title3" accessibilityRole="header" style={{ marginHorizontal: GUTTER, marginTop: SPACING.space6, marginBottom: SPACING.space3 }}>
          À éviter
        </ThemedText>
        <View style={[card, { marginHorizontal: GUTTER }]}>
          {view.donts.map((d, i) => (
            <ThemedText key={i} variant="body" style={{ marginBottom: i < view.donts.length - 1 ? SPACING.space2 : 0 }}>{`• ${d}`}</ThemedText>
          ))}
          {activity.safety ? <ThemedText variant="subheadline" color="label2" style={{ marginTop: SPACING.space3 }}>{activity.safety}</ThemedText> : null}
        </View>

        <View style={{ marginHorizontal: GUTTER, marginTop: SPACING.space8 }}>
          <MomentClose activity={activity} childId={childId} duration={view.duration} onSaved={() => router.back()} />
        </View>
      </ScrollView>

      <ScreenBar onBack={() => router.back()} />

      <View style={{ position: 'absolute', left: SPACING.space4, right: SPACING.space4, bottom: insets.bottom + SPACING.space2 }}>
        <GlassSurface strong radius={30}>
          <View style={{ flexDirection: 'row', padding: 6, gap: 6, alignItems: 'center' }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Pas ce soir"
              style={{ minHeight: 52, paddingHorizontal: SPACING.space4 + 2, alignItems: 'center', justifyContent: 'center' }}
            >
              <ThemedText variant="headline" color="label2">Pas ce soir</ThemedText>
            </Pressable>
            <Pressable
              onPress={start}
              accessibilityRole="button"
              accessibilityLabel={`Commencer, ${view.duration} minutes`}
              style={({ pressed }) => ({
                flex: 1, minHeight: 52, borderRadius: 26, backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1,
                alignItems: 'center', justifyContent: 'center',
              })}
            >
              <ThemedText variant="headline" style={{ color: colors.accentInk }}>{`Commencer · ${view.duration} min`}</ThemedText>
            </Pressable>
          </View>
        </GlassSurface>
      </View>

      <Sheet visible={whyOpen} onClose={() => setWhyOpen(false)} title="Pourquoi ça marche">
        <ThemedText variant="body">{activity.why_detail}</ThemedText>
      </Sheet>
    </View>
  );
}

export default function ActivityScreen() {
  return (
    <PremiumGate>
      <ActivityContent />
    </PremiumGate>
  );
}
