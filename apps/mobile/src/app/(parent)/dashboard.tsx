import { View, Text, ScrollView, Pressable } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useRouter } from 'expo-router';

export default function ParentDashboard() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16 pb-8 bg-black">
        <Text className="text-white text-sm mb-1">Bonjour 👋</Text>
        <Text className="text-white text-2xl font-bold">{user?.firstName ?? 'Parent'}</Text>
      </View>

      <View className="px-6 py-6">
        <Text className="text-xl font-bold mb-4">Mes enfants</Text>
        <Pressable
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4"
          onPress={() => router.push('/(parent)/children')}
        >
          <Text className="font-semibold text-base">Voir mes enfants →</Text>
        </Pressable>

        <Text className="text-xl font-bold mb-4 mt-2">Programmes actifs</Text>
        <Pressable
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4"
          onPress={() => router.push('/(parent)/programs')}
        >
          <Text className="font-semibold text-base">Voir les programmes →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
