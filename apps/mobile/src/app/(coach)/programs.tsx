import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { usePrograms, supabaseClient } from '@thrive/shared';

const AGE_GROUPS = ['8-11', '12-14', '15-17'];

export default function CoachProgramsScreen() {
  const { user } = useAuthStore();
  const { programs, isLoading } = usePrograms({ coachId: user?.id });

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ageGroup, setAgeGroup] = useState('8-11');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title) { Alert.alert('Erreur', 'Le titre est requis'); return; }
    setSaving(true);
    try {
      await supabaseClient.from('programs').insert({
        title, description, age_group: ageGroup,
        coach_id: user!.id, status: 'ACTIVE',
      });
      setShowModal(false);
      setTitle(''); setDescription('');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Mes programmes</Text>
          <Pressable className="bg-black rounded-xl px-4 py-2" onPress={() => setShowModal(true)}>
            <Text className="text-white font-semibold">+ Créer</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : programs.length === 0 ? (
          <View className="items-center mt-8">
            <Text className="text-4xl mb-4">🏋️</Text>
            <Text className="text-gray-500 text-center">Aucun programme créé.{`\n`}Appuie sur + Créer pour commencer.</Text>
          </View>
        ) : (
          programs.map((program) => (
            <View key={program.id} className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
              <Text className="text-lg font-bold mb-1">{program.title}</Text>
              {program.description && (
                <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>{program.description}</Text>
              )}
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-400">Groupe {program.age_group}</Text>
                <Text className="text-xs text-gray-400">
                  {program.program_enrollments?.length ?? 0} enfants · {program.total_sessions} séances
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold mb-6">Nouveau programme</Text>
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
              placeholder="Titre du programme"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
              placeholder="Description (optionnel)"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Text className="font-semibold mb-3">Groupe d'âge</Text>
            <View className="flex-row gap-2 mb-6">
              {AGE_GROUPS.map((ag) => (
                <Pressable
                  key={ag}
                  onPress={() => setAgeGroup(ag)}
                  className={`rounded-full px-4 py-2 mr-2 ${ ageGroup === ag ? 'bg-black' : 'bg-gray-100'}`}
                >
                  <Text className={ageGroup === ag ? 'text-white font-semibold' : 'text-gray-700'}>{ag}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              className="bg-black rounded-2xl py-4 items-center mb-3"
              onPress={handleCreate}
              disabled={saving}
            >
              <Text className="text-white font-semibold">{saving ? 'Création...' : 'Créer le programme'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowModal(false)}>
              <Text className="text-center text-gray-500">Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
