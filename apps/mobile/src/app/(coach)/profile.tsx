import { View, Text, Pressable, ScrollView } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { useRouter } from 'expo-router';
import { AccountPrivacySection } from '../../components/AccountPrivacySection';
import { HealthNotice } from '../../components/HealthNotice';

export default function CoachProfileScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16">
        <Text className="text-2xl font-bold mb-6">Mon profil coach</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <Text className="text-gray-500 text-sm">Prénom</Text>
          <Text className="font-semibold text-base">{user?.firstName ?? '—'}</Text>
        </View>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <Text className="text-gray-500 text-sm">Nom</Text>
          <Text className="font-semibold text-base">{user?.lastName ?? '—'}</Text>
        </View>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8">
          <Text className="text-gray-500 text-sm">Email</Text>
          <Text className="font-semibold text-base">{user?.email ?? '—'}</Text>
        </View>
        <Pressable
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 flex-row justify-between"
          onPress={() => router.push('/(coach)/notifications')}
          accessibilityRole="button"
        >
          <Text className="text-base">Notifications</Text>
          <Text className="text-gray-400 text-lg">›</Text>
        </Pressable>
        <HealthNotice />
        <AccountPrivacySection />
        <Pressable className="bg-black rounded-2xl py-4 items-center mb-12" onPress={handleSignOut}>
          <Text className="text-white font-semibold">Se déconnecter</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
