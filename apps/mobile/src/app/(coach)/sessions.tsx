import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { usePrograms, useSessions } from '@thrive/shared';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: '📅 Planifiée',
  IN_PROGRESS: '▶️ En cours',
  COMPLETED: '✅ Terminée',
  CANCELLED: '❌ Annulée',
  MISSED: '⚠️ Manquée',
};

export default function CoachSessionsScreen() {
  const { user } = useAuthStore();
  const { programs } = usePrograms({ coachId: user?.id });
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>();
  const { sessions, isLoading, updateSession } = useSessions({ programId: selectedProgramId });

  const [editSession, setEditSession] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    if (!editSession) return;
    setSaving(true);
    try {
      await updateSession(editSession.id, {
        coach_notes: notes,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      });
      setEditSession(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16">
        <Text className="text-2xl font-bold mb-4">Séances</Text>

        {/* Filtre programme */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setSelectedProgramId(undefined)}
              className={`rounded-full px-4 py-2 mr-2 ${!selectedProgramId ? 'bg-black' : 'bg-white border border-gray-200'}`}
            >
              <Text className={!selectedProgramId ? 'text-white font-semibold' : 'text-gray-700'}>Tous</Text>
            </Pressable>
            {programs.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedProgramId(p.id)}
                className={`rounded-full px-4 py-2 mr-2 ${selectedProgramId === p.id ? 'bg-black' : 'bg-white border border-gray-200'}`}
              >
                <Text className={selectedProgramId === p.id ? 'text-white font-semibold' : 'text-gray-700'}>
                  {p.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : sessions.length === 0 ? (
          <View className="items-center mt-8">
            <Text className="text-gray-500">Aucune séance trouvée.</Text>
          </View>
        ) : (
          sessions.map((session) => (
            <Pressable
              key={session.id}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
              onPress={() => {
                setEditSession(session);
                setNotes(session.coach_notes ?? '');
              }}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-bold">{session.title}</Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {session.children?.first_name} {session.children?.last_name}
                    {' · '}Séance {session.session_number}
                  </Text>
                </View>
                <Text className="text-xs">{STATUS_LABELS[session.status] ?? session.status}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {/* Modal notes */}
      <Modal visible={!!editSession} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold mb-2">{editSession?.title}</Text>
            <Text className="text-gray-500 text-sm mb-4">
              Séance {editSession?.session_number}
              {editSession?.children ? ` · ${editSession.children.first_name} ${editSession.children.last_name}` : ''}
            </Text>
            <Text className="font-semibold mb-2">Notes du coach</Text>
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-6 text-base"
              placeholder="Observations, points forts, axes d'amélioration..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Pressable
              className="bg-black rounded-2xl py-4 items-center mb-3"
              onPress={handleSaveNotes}
              disabled={saving}
            >
              <Text className="text-white font-semibold">
                {saving ? 'Enregistrement...' : '✅ Marquer comme terminée'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setEditSession(null)}>
              <Text className="text-center text-gray-500">Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
