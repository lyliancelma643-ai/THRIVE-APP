import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { Button, Chip, Chips, SPACING, SectionHeader, Section, ThemedText, useTheme } from '../../../design';
import { FicheView } from '../../../components/maison/FicheView';
import { MomentClose } from '../../../components/maison/MomentClose';
import { buildFicheVM } from '../../../components/maison/models';
import { PLACE_CHOICES, getActivity, resolveActivity, type AgeBand, type Duration } from '../../../lib/p3';
import { type PlaceChoice } from '../../../components/activite/flow';

// L « Fiche moment » : vignette, objectif, durée, ce qu’on dit pour commencer, les étapes, niveau de preuve, puis la barre
// « Pas ce soir / Commencer ». « C’est fait ? » reste en bas de page pour noter un moment vécu sans minuteur.
// Le rendu vit dans FicheView ; la route ne fait que brancher les données et la navigation.

function ActivityContent() {
  const router = useRouter();
  const { colors } = useTheme();
  const { activityId, childId, band } = useLocalSearchParams<{ activityId: string; childId: string; band: AgeBand }>();
  const activity = getActivity(activityId ?? '');
  const durations = (activity?.durations ?? [10]) as Duration[];
  const [duration, setDuration] = useState<Duration>(durations[0]);
  const [place, setPlace] = useState<PlaceChoice>('maison');

  const view = activity && band ? resolveActivity(activity, duration, band) : null;

  // childId absent (lien profond incomplet) : on ne peut rien enregistrer → écran « indisponible ».
  if (!activity || !view || activity.week === null || !childId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.space6, backgroundColor: colors.bgGrouped }} accessibilityRole="alert">
        <ThemedText variant="body" color="label2" style={{ textAlign: 'center' }}>Cette activité n’est pas disponible.</ThemedText>
        <Button variant="gray" size="md" label="Retour" onPress={() => router.back()} style={{ marginTop: SPACING.space4 }} />
      </View>
    );
  }

  const start = () =>
    router.push({
      pathname: '/(parent)/moment/[activityId]',
      params: { activityId: activity.id, childId, band: band!, duration: String(view.duration), lieu: place },
    });

  return (
    <FicheView
      vm={buildFicheVM(activity, view)}
      onBack={() => router.back()}
      onDuration={(d) => setDuration(d as Duration)}
      onStart={start}
    >
      <SectionHeader small title="Où ?" />
      <Chips style={{ paddingHorizontal: 16, marginBottom: SPACING.space4 }}>
        {PLACE_CHOICES.map((p) => (
          <Chip key={p.id} tall label={p.label} on={place === p.id} onPress={() => setPlace(p.id)} />
        ))}
      </Chips>
      <SectionHeader small title="C’est fait ?" />
      <Section>
        <MomentClose activity={activity} childId={childId} duration={view.duration} onSaved={() => router.back()} />
      </Section>
    </FicheView>
  );
}

export default function ActivityScreen() {
  return (
    <PremiumGate>
      <ActivityContent />
    </PremiumGate>
  );
}
