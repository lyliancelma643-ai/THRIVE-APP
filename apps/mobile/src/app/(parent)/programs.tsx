import { View, Text, ScrollView } from 'react-native';

export default function ProgramsScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-16">
        <Text className="text-2xl font-bold mb-6">Programmes THRIVE</Text>
        <Text className="text-gray-500">Aucun programme actif pour l'instant.</Text>
        {/* TODO Étape 5 : programmes dynamiques */}
      </View>
    </ScrollView>
  );
}
