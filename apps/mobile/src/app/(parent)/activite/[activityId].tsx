import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PremiumGate } from '../../../components/subscription/PremiumGate';
import { recordMoment } from '../../../hooks/useMaison';
import { getActivity, resolveActivity, type AgeBand, type Duration } from '../../../lib/p3';

const OUTCOMES = [
  { id: 'ACCROCHE', label: 'Ça a accroché' },
  { id: 'MOYEN', label: 'Moyen' },
  { id: 'PAS_CE_SOIR', label: 'Pas ce soir' },
] as const;

function ActivityContent() {
  const router = useRouter();
  const { activityId, childId, band } = useLocalSearchParams<{ activityId: string; childId: string; band: AgeBand }>();
  const activity = getActivity(activityId ?? '');
  const durations = (activity?.durations ?? [10]) as Duration[];
  const [duration, setDuration] = useState<Duration>(durations[0]);
  const [keptPhrase, setKeptPhrase] = useState('');
  const [saving, setSaving] = useState(false);

  const view = activity && band ? resolveActivity(activity, duration, band) : null;

  // childId absent (lien profond incomplet) : on ne peut rien enregistrer → écran « indisponible ».
  if (!activity || !view || activity.week === null || !childId) {
    return (
      <View className="flex-1 items-center justify-center px-6" accessibilityRole="alert">
        <Text className="text-gray-500 text-center">Cette activité n’est pas disponible.</Text>
        <Pressable className="mt-4" onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
          <Text className="underline">Retour</Text>
        </Pressable>
      </View>
    );
  }

  const save = async (outcome: (typeof OUTCOMES)[number]['id']) => {
    setSaving(true);
    try {
      await recordMoment({
        childId,
        activityId: activity.id,
        week: activity.week!,
        duration: view.duration,
        outcome,
        keptPhrase,
      });
      router.back();
    } catch {
      Alert.alert('Enregistrement impossible', 'Vérifiez votre connexion et réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const steps = view.screen_steps?.length ? view.screen_steps : view.steps;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 pt-16 pb-6 bg-black">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={8} className="mb-4">
          <Text className="text-gray-300">‹ Retour</Text>
        </Pressable>
        <Text className="text-gray-400 text-xs mb-1">{view.subtitle}</Text>
        <Text className="text-white text-2xl font-bold">{view.title}</Text>
        <Text className="text-gray-300 text-sm mt-2">{view.objective}</Text>
      </View>

      <View className="px-6 py-6">
        {durations.length > 1 && (
          <View className="flex-row mb-5">
            {durations.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                className={`rounded-full px-4 py-2 mr-2 ${d === duration ? 'bg-black' : 'bg-white border border-gray-200'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: d === duration }}
              >
                <Text className={d === duration ? 'text-white font-semibold' : 'text-gray-700'}>{d} min</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
          <Text className="text-gray-500 text-xs font-semibold mb-2">POUR COMMENCER, DITES</Text>
          <Text className="text-base">{view.opener}</Text>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
          <Text className="text-gray-500 text-xs font-semibold mb-2">ÉTAPES</Text>
          {steps.map((s, i) => (
            <Text key={i} className="text-base mb-2">
              {i + 1}. {s}
            </Text>
          ))}
          {view.extensions.map((e, i) => (
            <Text key={`x${i}`} className="text-base mb-2 text-gray-600">
              + {e.text}
            </Text>
          ))}
        </View>

        {view.variant && (
          <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
            <Text className="text-gray-500 text-xs font-semibold mb-2">À CET ÂGE</Text>
            <Text className="text-base">{view.variant}</Text>
          </View>
        )}

        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
          <Text className="text-gray-500 text-xs font-semibold mb-2">À ÉVITER</Text>
          {view.donts.map((d, i) => (
            <Text key={i} className="text-base mb-1">• {d}</Text>
          ))}
          {activity.safety ? <Text className="text-sm text-gray-600 mt-2">{activity.safety}</Text> : null}
        </View>

        <Text className="text-gray-500 text-xs font-semibold mb-2">UNE PHRASE À GARDER (FACULTATIF)</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-5 text-base"
          placeholder="Ce qu’il ou elle a dit, ce que vous voulez retenir"
          value={keptPhrase}
          onChangeText={setKeptPhrase}
          maxLength={500}
          multiline
          accessibilityLabel="Une phrase à garder, facultatif"
        />

        <Text className="text-gray-500 text-xs font-semibold mb-2">C’EST FAIT ? COMMENT ÇA S’EST PASSÉ</Text>
        {saving ? (
          <ActivityIndicator accessibilityLabel="Enregistrement en cours" />
        ) : (
          OUTCOMES.map((o) => (
            <Pressable
              key={o.id}
              className="bg-black rounded-2xl py-4 items-center mb-2"
              onPress={() => save(o.id)}
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold">{o.label}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default function ActivityScreen() {
  return (
    <PremiumGate>
      <ActivityContent />
    </PremiumGate>
  );
}
