import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabaseClient as supabase, useFamily, useChildren } from '@thrive/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection, ReadOnlyNotice } from '../../components/access/LockedSection';
import { sectionView } from '../../services/access';

// Mes séances : séances en présentiel de l'enfant (à venir + historique).
// Accès : section Mes séances de access_state() (migration 080) ; verrouillé →
// squelette factice flouté, AUCUNE requête de données (la RLS refuse aussi).

type Session = {
  id: string;
  session_number: number;
  title: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Planifiée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Faite',
  CANCELLED: 'Annulée',
  MISSED: 'Manquée',
  POSTPONED: 'Reportée',
};

function when(s: Session): string {
  const d = s.completed_at ?? s.scheduled_at;
  if (!d) return 'Date à venir';
  return new Date(d).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function SeancesScreen() {
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const access = useSubscriptionStore((st) => st.access);
  const view = access ? sectionView(access, 'seances') : null;
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    if (!child?.id || !view || view === 'locked') return;
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('sessions')
      .select('id, session_number, title, status, scheduled_at, completed_at')
      .eq('child_id', child.id)
      .order('session_number', { ascending: true });
    setLoading(false);
    if (error) setLoadError(true);
    else setSessions((data ?? []) as Session[]);
  }, [child?.id, view]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (childrenLoading || !view) return <ActivityIndicator className="mt-24" />;
  if (view === 'locked') return <LockedSection section="seances" />;
  if (loadError && !sessions) return <OfflineState onRetry={reload} />;

  const upcoming = (sessions ?? []).filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS' || s.status === 'POSTPONED');
  const history = (sessions ?? []).filter((s) => !upcoming.includes(s));

  return (
    <ScrollView className="flex-1 bg-gray-50" refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-bold" accessibilityRole="header">Mes séances</Text>
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
        {view === 'readonly' && <ReadOnlyNotice />}
        {!child ? (
          <Text className="text-gray-500">Ajoutez votre enfant pour voir ses séances.</Text>
        ) : !sessions ? (
          <ActivityIndicator />
        ) : sessions.length === 0 ? (
          <Text className="text-gray-500">Les séances de {child.first_name} apparaîtront ici dès qu’elles seront planifiées par le coach.</Text>
        ) : (
          <>
            {view === 'open' && upcoming.length > 0 && (
              <>
                <Text className="text-lg font-bold mb-3">À venir</Text>
                {upcoming.map((s) => (
                  <View key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
                    <Text className="text-gray-500 text-xs">Séance {s.session_number} · {STATUS_LABEL[s.status] ?? s.status}</Text>
                    <Text className="font-semibold mt-1">{s.title}</Text>
                    <Text className="text-gray-600 text-sm mt-1">{when(s)}</Text>
                  </View>
                ))}
              </>
            )}
            <Text className="text-lg font-bold mb-3 mt-2">Historique</Text>
            {history.length === 0 ? (
              <Text className="text-gray-500">Aucune séance passée pour le moment.</Text>
            ) : (
              history.map((s) => (
                <View key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
                  <Text className="text-gray-500 text-xs">Séance {s.session_number} · {STATUS_LABEL[s.status] ?? s.status}</Text>
                  <Text className="font-semibold mt-1">{s.title}</Text>
                  <Text className="text-gray-600 text-sm mt-1">{when(s)}</Text>
                </View>
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

