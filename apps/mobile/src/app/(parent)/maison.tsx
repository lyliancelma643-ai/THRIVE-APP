import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren } from '@thrive/shared';
import { PremiumGate } from '../../components/subscription/PremiumGate';
import { HealthNotice } from '../../components/HealthNotice';
import { useMaison } from '../../hooks/useMaison';
import {
  activitiesOfWeek,
  ageFromBirthDate,
  bandForAge,
  getActivity,
  getWeek,
  momentsPhrase,
  momentsCount,
  p3Pool,
  unlockedWeeks,
  weeklyProgress,
} from '../../lib/p3';
import { OfflineState } from '../../components/OfflineState';

// « Le moment qui compte » : une activité de 10 minutes par soir avec son enfant.
// Semaine N+1 ouverte quand les 3 fiches de la semaine N ont été vécues.

function MaisonContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const { moments, isLoading, error, reload } = useMaison(child?.id);

  useFocusEffect(
    React.useCallback(() => {
      reload();
    }, [reload]),
  );

  const age = ageFromBirthDate(child?.date_of_birth);
  const band = age === null ? null : bandForAge(age);
  const doneIds = useMemo(() => new Set(moments.map((m) => m.activity_id)), [moments]);
  const openWeek = unlockedWeeks(doneIds);
  const week = getWeek(openWeek);
  const pool = useMemo(() => p3Pool(), []);
  const weekActivities = activitiesOfWeek(openWeek, pool).filter((a) => !band || a.age_bands.includes(band));
  const progress = weeklyProgress(moments, new Date());
  const phrase = child ? momentsPhrase(momentsCount(moments), child.first_name) : null;

  if (childrenLoading) return <ActivityIndicator className="mt-24" />;
  if (error && moments.length === 0) return <OfflineState message={error} onRetry={reload} />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} />}
    >
      <View className="px-6 pt-16 pb-8 bg-black">
        <Text className="text-gray-400 text-xs font-semibold tracking-widest mb-1">LE MOMENT QUI COMPTE</Text>
        <Text className="text-white text-2xl font-bold">Ce soir, dix minutes ensemble</Text>
        {phrase && <Text className="text-gray-300 text-sm mt-2">{phrase}</Text>}
      </View>

      <View className="px-6 py-6">
        {children.length === 0 ? (
          <Pressable
            className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 items-center"
            onPress={() => router.push('/(parent)/children')}
          >
            <Text className="text-gray-500">Ajoutez votre enfant pour recevoir ses activités.</Text>
          </Pressable>
        ) : (
          <>
            {children.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                {children.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedId(c.id)}
                    className={`rounded-full px-4 py-2 mr-2 ${c.id === child?.id ? 'bg-black' : 'bg-white border border-gray-200'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: c.id === child?.id }}
                  >
                    <Text className={c.id === child?.id ? 'text-white font-semibold' : 'text-gray-700'}>
                      {c.first_name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {!band ? (
              <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
                <Text className="text-gray-600">
                  Les activités Maison sont conçues pour les 8 à 17 ans. Vérifiez la date de naissance
                  de {child?.first_name} dans « Mes enfants ».
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-gray-500 text-xs font-semibold tracking-widest">SEMAINE {openWeek}</Text>
                <Text className="text-xl font-bold mb-1">{week?.title}</Text>
                <Text className="text-gray-500 text-sm mb-4">
                  {progress.done} moment{progress.done > 1 ? 's' : ''} sur {progress.target} cette semaine
                </Text>

                {error && <Text className="text-red-500 text-sm mb-3">{error}</Text>}

                {weekActivities.map((a) => {
                  const done = doneIds.has(a.id);
                  return (
                    <Pressable
                      key={a.id}
                      className="bg-white rounded-2xl p-5 mb-3 border border-gray-100 flex-row items-center"
                      onPress={() =>
                        router.push({
                          pathname: '/(parent)/activite/[activityId]',
                          params: { activityId: a.id, childId: child!.id, band },
                        })
                      }
                      accessibilityRole="button"
                    >
                      <View className="flex-1">
                        <Text className="font-bold text-base">{a.title}</Text>
                        <Text className="text-gray-500 text-sm mt-1">{a.objective}</Text>
                        <Text className="text-gray-400 text-xs mt-2">{a.base_duration} min</Text>
                      </View>
                      <Text className="text-lg ml-3">{done ? '✓' : '›'}</Text>
                    </Pressable>
                  );
                })}

                <Text className="text-xl font-bold mt-6 mb-3">Le carnet</Text>
                {moments.length === 0 ? (
                  <View className="bg-white rounded-2xl p-5 border border-gray-100">
                    <Text className="text-gray-500 text-sm">
                      Vos moments vécus avec {child?.first_name} s’afficheront ici.
                    </Text>
                  </View>
                ) : (
                  moments.slice(0, 20).map((m) => (
                    <View key={`${m.activity_id}-${m.created_at}`} className="bg-white rounded-2xl p-4 mb-2 border border-gray-100">
                      <Text className="font-semibold">{getActivity(m.activity_id)?.title ?? m.activity_id}</Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        {new Date(m.created_at).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </Text>
                      {m.kept_phrase ? <Text className="text-gray-600 text-sm mt-2">« {m.kept_phrase} »</Text> : null}
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        <View className="mt-6">
          <HealthNotice />
        </View>
      </View>
    </ScrollView>
  );
}

export default function MaisonScreen() {
  return (
    <PremiumGate>
      <MaisonContent />
    </PremiumGate>
  );
}
