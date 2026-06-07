import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren } from '@thrive/shared';

function calculateAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function ChildrenScreen() {
  const { user } = useAuthStore();
  const { family, isLoading: familyLoading, createFamily } = useFamily(user?.id);
  const { children, isLoading, createChild } = useChildren(family?.id);

  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!firstName || !lastName || !dob) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    setSaving(true);
    try {
      if (!family) {
        await createFamily(`Famille ${user?.lastName ?? ''}`);
      }
      await createChild({ first_name: firstName, last_name: lastName, date_of_birth: dob });
      setShowModal(false);
      setFirstName(''); setLastName(''); setDob('');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  if (isLoading || familyLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4 flex-row justify-between items-center">
        <Text className="text-2xl font-bold">Mes enfants</Text>
        <Pressable
          className="bg-black rounded-xl px-4 py-2"
          onPress={() => setShowModal(true)}
        >
          <Text className="text-white font-semibold">+ Ajouter</Text>
        </Pressable>
      </View>

      {children.length === 0 ? (
        <View className="px-6 mt-8 items-center">
          <Text className="text-4xl mb-4">👶</Text>
          <Text className="text-gray-500 text-center">
            Aucun enfant ajouté.{`\n`}Appuie sur + Ajouter pour commencer.
          </Text>
        </View>
      ) : (
        <View className="px-6">
          {children.map((child) => (
            <View key={child.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <Text className="text-lg font-bold">
                {child.first_name} {child.last_name}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {calculateAge(child.date_of_birth)} ans
              </Text>
              {(child.child_badges ?? []).length > 0 && (
                <View className="flex-row flex-wrap mt-3 gap-2">
                  {child.child_badges!.map((cb, i) => (
                    <View key={i} className="bg-yellow-100 rounded-full px-3 py-1">
                      <Text className="text-xs font-medium text-yellow-800">
                        🏅 {cb.badges.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Modal Ajout */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold mb-6">Nouvel enfant</Text>
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
              placeholder="Prénom"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-4 text-base"
              placeholder="Nom"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              className="border border-gray-200 rounded-2xl px-4 py-4 mb-6 text-base"
              placeholder="Date de naissance (AAAA-MM-JJ)"
              value={dob}
              onChangeText={setDob}
            />
            <Pressable
              className="bg-black rounded-2xl py-4 items-center mb-3"
              onPress={handleAdd}
              disabled={saving}
            >
              <Text className="text-white font-semibold">
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </Text>
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
