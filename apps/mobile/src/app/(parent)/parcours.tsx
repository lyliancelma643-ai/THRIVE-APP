import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { OfflineState } from '../../components/OfflineState';
import { useMaisonContext } from '../../hooks/useMaison';
import { Pill, SPACING, ThemedText, useTheme } from '../../design';
import { ActivityPoster } from '../../components/maison/ActivityPoster';
import { ScreenBar } from '../../components/maison/ScreenBar';
import { antiRefusal, buildParcours } from '../../components/maison/logic';
import type { P3Activity } from '../../lib/p3';

// K2 « Tout le parcours » : les 13 semaines et toutes leurs activités. Verrou neutre pour
// les semaines pas encore ouvertes (jamais « en retard »).

const GUTTER = SPACING.space4 + 4;
const GAP = SPACING.space3;

function ParcoursContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ childId?: string; filtre?: string }>();
  const ctx = useMaisonContext(params.childId);
  const { child, band, doneIds, pool, error, moments, reload } = ctx;
  const cell = Math.floor((width - GUTTER * 2 - GAP * 2) / 3);
  const refus = params.filtre === 'refus';

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  const parcours = useMemo(() => buildParcours(pool, doneIds), [pool, doneIds]);
  const bonus = useMemo(() => pool.filter((a) => a.week === null), [pool]);
  const refusList = useMemo(() => antiRefusal(pool, band), [pool, band]);

  if (ctx.childrenLoading) return <ActivityIndicator style={{ marginTop: 96 }} accessibilityLabel="Chargement" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  const open = (a: P3Activity) => {
    if (!child || !band) return;
    router.push({ pathname: '/(parent)/activite/[activityId]', params: { activityId: a.id, childId: child.id, band } });
  };

  const grid = (list: P3Activity[], locked = false) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.space4, columnGap: GAP, paddingHorizontal: GUTTER, marginTop: SPACING.space3 }}>
      {list.map((a) => (
        <ActivityPoster key={a.id} activity={a} size={cell} locked={locked} done={doneIds.has(a.id)} onPress={() => open(a)} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 64, paddingBottom: SPACING.space8 * 2 }}>
        <ThemedText variant="largeTitle" accessibilityRole="header" style={{ marginHorizontal: GUTTER }}>
          {refus ? 'Quand il dit non' : 'Tout le parcours'}
        </ThemedText>
        <ThemedText variant="subheadline" color="label2" style={{ marginHorizontal: GUTTER, marginTop: SPACING.space1 }}>
          {refus
            ? 'Des moments qui marchent même les soirs où il dit non.'
            : `13 semaines · ${pool.length} activités. Les trois premières de chaque semaine suffisent ; les autres vont plus loin.`}
        </ThemedText>

        {refus ? (
          <View style={{ marginTop: SPACING.space3 }}>{grid(refusList)}</View>
        ) : (
          <>
            {parcours.map((w) => (
              <View key={w.week} style={{ marginTop: SPACING.space6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: GUTTER }}>
                  <ThemedText variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
                    {`Semaine ${w.week} · ${w.title}`}
                  </ThemedText>
                  {w.state === 'faite' ? (
                    <Pill label="Faite" tone="ok" />
                  ) : w.state === 'en_cours' ? (
                    <Pill label="En cours" tone="neutral" />
                  ) : (
                    <View accessible accessibilityLabel="Pas encore ouverte">
                      <Ionicons name="lock-closed-outline" size={16} color={colors.label2} />
                    </View>
                  )}
                </View>
                {grid(w.activities, w.state === 'a_venir')}
              </View>
            ))}
            {bonus.length > 0 ? (
              <View style={{ marginTop: SPACING.space6 }}>
                <ThemedText variant="title3" accessibilityRole="header" style={{ marginHorizontal: GUTTER }}>
                  Bonus · en famille
                </ThemedText>
                {grid(bonus)}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <ScreenBar onBack={() => router.back()} />
    </View>
  );
}

export default function ParcoursScreen() {
  return (
    <PremiumGate>
      <ParcoursContent />
    </PremiumGate>
  );
}
