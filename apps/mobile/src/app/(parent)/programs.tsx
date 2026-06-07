import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { usePrograms } from '@thrive/shared';

const AGE_GROUPS = ['Tous', '8-11', '12-14', '15-17'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  DRAFT: 'Brouillon',
  COMPLETED: 'Terminé',
  PAUSED: 'En pause',
};

export default function ProgramsScreen() {
  const [selectedAge, setSelectedAge] = useState('Tous');
  const { programs, isLoading } = usePrograms({
    ageGroup: selectedAge === 'Tous' ? undefined : selectedAge,
    status: 'ACTIVE',
  });

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-4">
        <Text className="text-2xl font-bold mb-4">Programmes THRIVE 🏆</Text>

        {/* Filtres âge */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-2">
            {AGE_GROUPS.map((age) => (
              <Pressable
                key={age}
                onPress={() => setSelectedAge(age)}
                className={`rounded-full px-4 py-2 mr-2 ${
                  selectedAge === age ? 'bg-black' : 'bg-white border border-gray-200'
                }`}
              >
                <Text className={selectedAge === age ? 'text-white font-semibold' : 'text-gray-700'}>
                  {age}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : programs.length === 0 ? (
          <View className="items-center mt-8">
            <Text className="text-4xl mb-4">🎯</Text>
            <Text className="text-gray-500 text-center">Aucun programme disponible pour ce groupe.</Text>
          </View>
        ) : (
          programs.map((program) => (
            <View key={program.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-lg font-bold flex-1">{program.title}</Text>
                <View className={`rounded-full px-3 py-1 ml-2 ${STATUS_COLORS[program.status] ?? 'bg-gray-100'}`}>
                  <Text className={`text-xs font-semibold ${STATUS_COLORS[program.status]?.split(' ')[1] ?? 'text-gray-700'}`}>
                    {STATUS_LABELS[program.status] ?? program.status}
                  </Text>
                </View>
              </View>
              {program.description && (
                <Text className="text-gray-500 text-sm mb-3" numberOfLines={2}>
                  {program.description}
                </Text>
              )}
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-400">Groupe {program.age_group}</Text>
                <Text className="text-xs text-gray-400">
                  {program.total_sessions} séances
                  {program.program_enrollments
                    ? ` · ${program.program_enrollments.length} inscrits`
                    : ''}
                </Text>
              </View>
              {program.profiles && (
                <Text className="text-xs text-gray-400 mt-1">
                  Coach : {program.profiles.first_name} {program.profiles.last_name}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
