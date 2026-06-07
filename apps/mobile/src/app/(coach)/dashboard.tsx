import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { usePrograms, useSessions } from '@thrive/shared';

export default function CoachDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { programs, isLoading: programsLoading } = usePrograms({ coachId: user?.id });
  const { sessions, isLoading: sessionsLoading } = useSessions();

  const activePrograms = programs.filter((p) => p.status === 'ACTIVE');
  const todaySessions = sessions.filter((s) => {
    if (!s.scheduled_at) return false;
    const today = new Date().toDateString();
    return new Date(s.scheduled_at).toDateString() === today;
  });

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 pt-16 pb-8 bg-black">
        <Text className="text-white text-sm mb-1">Tableau de bord Coach 🎯</Text>
        <Text className="text-white text-2xl font-bold">{user?.firstName ?? 'Coach'}</Text>
      </View>

      <View className="px-6 py-6">
        {/* Stats rapides */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-3xl font-bold">{activePrograms.length}</Text>
            <Text className="text-gray-500 text-sm">Programmes actifs</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-3xl font-bold">{todaySessions.length}</Text>
            <Text className="text-gray-500 text-sm">Séances aujourd'hui</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-3xl font-bold">
              {programs.reduce((acc, p) => acc + (p.program_enrollments?.length ?? 0), 0)}
            </Text>
            <Text className="text-gray-500 text-sm">Enfants suivis</Text>
          </View>
        </View>

        {/* Mes programmes */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xl font-bold">Mes programmes</Text>
          <Pressable onPress={() => router.push('/(coach)/programs')}>
            <Text className="text-gray-500 text-sm">Voir tout</Text>
          </Pressable>
        </View>

        {programsLoading ? (
          <ActivityIndicator />
        ) : programs.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-gray-100 items-center">
            <Text className="text-gray-500 text-sm">Aucun programme créé</Text>
          </View>
        ) : (
          programs.slice(0, 3).map((program) => (
            <View key={program.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <Text className="font-bold">{program.title}</Text>
              <View className="flex-row justify-between mt-1">
                <Text className="text-gray-500 text-xs">Groupe {program.age_group}</Text>
                <Text className="text-gray-500 text-xs">
                  {program.program_enrollments?.length ?? 0} enfants
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Séances aujourd'hui */}
        <Text className="text-xl font-bold mb-3 mt-2">Séances aujourd'hui</Text>
        {sessionsLoading ? (
          <ActivityIndicator />
        ) : todaySessions.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 border border-gray-100 items-center">
            <Text className="text-gray-500 text-sm">Aucune séance aujourd'hui</Text>
          </View>
        ) : (
          todaySessions.map((session) => (
            <View key={session.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <Text className="font-bold">{session.title}</Text>
              <Text className="text-gray-500 text-xs">
                {session.children?.first_name} {session.children?.last_name}
                {' · '}Séance {session.session_number}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
