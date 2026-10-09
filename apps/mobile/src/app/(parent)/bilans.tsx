import React, { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { OfflineState } from '../../components/OfflineState';

// Bilans de l'enfant : progression dans les 13 séances, coach, questionnaires
// à remplir et bilans envoyés par le coach (table parent_reports, RLS famille).

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.thrivesportpositive.com';
const TOTAL_SESSIONS = 13;

const SECTION_LABELS: Record<string, string> = {
  message_coach: 'Le mot du coach',
  forces: 'Ses forces',
  resume: 'Résumé de la séance',
  objectif: 'Habileté travaillée',
  recommandations_maison: 'À la maison',
  transfert: 'Dans la vie de tous les jours',
};

type Report = {
  id: string;
  created_at: string;
  parent_visible_body: { session_number?: number | null; sections?: Record<string, unknown> } | null;
};

type BilanState = {
  done: number;
  coach: string | null;
  pending: { kind: string; token: string }[];
  reports: Report[];
};

function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(String).join(' · ');
  if (typeof v === 'object') return null;
  return String(v);
}

async function loadBilans(childId: string): Promise<BilanState> {
  const [sessions, assignment, pending, reports] = await Promise.all([
    supabase.from('sessions').select('status').eq('child_id', childId),
    supabase
      .from('coach_assignments')
      .select('profiles:coach_id (first_name, last_name)')
      .eq('child_id', childId)
      .eq('is_active', true)
      .limit(1),
    supabase
      .from('questionnaires')
      .select('kind, access_token')
      .eq('child_id', childId)
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .not('access_token', 'is', null),
    supabase
      .from('parent_reports')
      .select('id, created_at, parent_visible_body')
      .eq('child_id', childId)
      .order('created_at', { ascending: false }),
  ]);
  const done = (sessions.data ?? []).filter((s: { status: string }) => s.status === 'COMPLETED').length;
  const a = (assignment.data ?? [])[0] as { profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] } | undefined;
  const p = Array.isArray(a?.profiles) ? a?.profiles[0] : a?.profiles;
  return {
    done,
    coach: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : null,
    pending: ((pending.data ?? []) as { kind: string; access_token: string }[]).map((q) => ({
      kind: q.kind,
      token: q.access_token,
    })),
    reports: (reports.data ?? []) as Report[],
  };
}

export default function BilansScreen() {
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const [data, setData] = useState<BilanState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true);
    setLoadError(false);
    try {
      setData(await loadBilans(child.id));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (childrenLoading) return <ActivityIndicator className="mt-24" />;
  if (loadError && !data) return <OfflineState onRetry={reload} />;

  return (
    <ScrollView className="flex-1 bg-gray-50" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-bold">Bilans</Text>
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            {children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedId(c.id)}
                className={`rounded-full px-4 py-2 mr-2 ${c.id === child?.id ? 'bg-black' : 'bg-white border border-gray-200'}`}
                accessibilityRole="button"
              >
                <Text className={c.id === child?.id ? 'text-white font-semibold' : 'text-gray-700'}>{c.first_name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View className="px-6 pb-12">
        {!child ? (
          <Text className="text-gray-500">Ajoutez votre enfant pour suivre ses bilans.</Text>
        ) : !data ? (
          <ActivityIndicator />
        ) : (
          <>
            <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
              <Text className="text-gray-500 text-sm">Programme THRIVE de {child.first_name}</Text>
              <Text className="text-3xl font-bold mt-1">
                {data.done}/{TOTAL_SESSIONS}
              </Text>
              <Text className="text-gray-500 text-sm">séances réalisées</Text>
              <View className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <View className="h-2 bg-black" style={{ width: `${Math.round((data.done / TOTAL_SESSIONS) * 100)}%` }} />
              </View>
              {data.coach && <Text className="text-gray-500 text-sm mt-3">Coach : {data.coach}</Text>}
            </View>

            {data.pending.map((q) => (
              <Pressable
                key={q.token}
                className="bg-black rounded-2xl p-5 mb-4"
                onPress={() => WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/q/${q.token}`)}
                accessibilityRole="link"
              >
                <Text className="text-white font-bold">Questionnaire à remplir avec {child.first_name}</Text>
                <Text className="text-gray-300 text-sm mt-1">
                  Quelques minutes, sur votre téléphone. Ses réponses sont partagées avec son coach.
                </Text>
              </Pressable>
            ))}

            <Text className="text-xl font-bold mb-3 mt-2">Bilans du coach</Text>
            {data.reports.length === 0 ? (
              <View className="bg-white rounded-2xl p-5 border border-gray-100">
                <Text className="text-gray-500 text-sm">Les bilans de séance apparaîtront ici après chaque séance.</Text>
              </View>
            ) : (
              data.reports.map((r) => {
                const body = r.parent_visible_body ?? {};
                const sections = body.sections ?? {};
                return (
                  <View key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 mb-3">
                    <Text className="font-bold text-base">
                      {body.session_number ? `Séance ${body.session_number}` : 'Bilan'}
                    </Text>
                    <Text className="text-gray-400 text-xs mb-2">
                      {new Date(r.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    {Object.keys(SECTION_LABELS).map((k) => {
                      const t = asText(sections[k]);
                      if (!t) return null;
                      return (
                        <View key={k} className="mt-2">
                          <Text className="text-gray-500 text-xs font-semibold">{SECTION_LABELS[k].toUpperCase()}</Text>
                          <Text className="text-base mt-1">{t}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
