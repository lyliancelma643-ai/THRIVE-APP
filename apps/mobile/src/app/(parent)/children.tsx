import { View, Text, ScrollView } from 'react-native';

export default function ChildrenScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16">
        <Text className="text-2xl font-bold mb-6">Mes enfants</Text>
        <Text className="text-gray-500">Aucun enfant ajouté pour l'instant.</Text>
        {/* TODO Étape 5 : liste dynamique depuis Supabase */}
      </View>
    </ScrollView>
  );
}
