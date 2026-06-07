import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useFamily, useChildren, useSessions } from '@thrive/shared';

export default function ParentDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);

  const upcomingSessions = useSessions({ childId: children[0]?.id });
  const nextSessions = upcomingSessions.sessions
    .filter((s) => s.status === 'SCHEDULED')
    .slice(0, 3);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 pt-16 pb-8 bg-black">
        <Text className="text-white text-sm mb-1">Bonjour 👋</Text>
        <Text className="text-white text-2xl font-bold">{user?.firstName ?? 'Parent'}</Text>
        {family && <Text className="text-gray-400 text-sm mt-1">Famille {family.name}</Text>}
      </View>

      <View className="px-6 py-6">
        {/* Mes enfants */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xl font-bold">Mes enfants</Text>
          <Pressable onPress={() => router.push('/(parent)/children')}>
            <Text className="text-gray-500 text-sm">Voir tout</Text>
          </Pressable>
        </View>

        {childrenLoading ? (
          <ActivityIndicator />
        ) : children.length === 0 ? (
          <Pressable
            className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 mb-6 items-center"
            onPress={() => router.push('/(parent)/children')}
          >
            <Text className="text-3xl mb-2">👶</Text>
            <Text className="text-gray-500 text-sm">Ajouter un enfant</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {children.map((child) => (
              <View key={child.id} className="bg-white rounded-2xl p-4 mr-3 w-36 shadow-sm border border-gray-100">
                <Text className="text-3xl mb-2">🧒</Text>
                <Text className="font-bold">{child.first_name}</Text>
                <Text className="text-gray-500 text-xs">{child.last_name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Prochaines séances */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xl font-bold">Prochaines séances</Text>
        </View>

        {nextSessions.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 items-center border border-gray-100">
            <Text className="text-gray-500 text-sm">Aucune séance planifiée</Text>
          </View>
        ) : (
          nextSessions.map((session) => (
            <View key={session.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <Text className="font-semibold">{session.title}</Text>
              <Text className="text-gray-500 text-xs mt-1">Séance {session.session_number}</Text>
              {session.scheduled_at && (
                <Text className="text-gray-400 text-xs">
                  {new Date(session.scheduled_at).toLocaleDateString('fr-CA')}
                </Text>
              )}
            </View>
          ))
        )}

        {/* Raccourci programmes */}
        <Pressable
          className="bg-black rounded-2xl p-5 mt-4 flex-row justify-between items-center"
          onPress={() => router.push('/(parent)/programs')}
        >
          <View>
            <Text className="text-white font-bold text-base">Programmes THRIVE</Text>
            <Text className="text-gray-400 text-sm">Découvrir les programmes</Text>
          </View>
          <Text className="text-white text-xl">🏆</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
