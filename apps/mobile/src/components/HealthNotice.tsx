import React from 'react';
import { View, Text, Linking } from 'react-native';

// Avertissement santé (Apple 1.4.1) et ressources d'aide, affichés dans l'app.
// Mêmes ressources que la page web « Quand consulter ».
const RESOURCES = [
  { label: 'Info-Social 811 (option 2)', tel: '811' },
  { label: '9-8-8 · ligne d’aide en cas de crise de suicide', tel: '988' },
  { label: 'Jeunesse, J’écoute · 1 800 668-6868', tel: '18006686868' },
  { label: 'Urgence · 9-1-1', tel: '911' },
];

export function HealthNotice() {
  return (
    <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
      <Text className="font-semibold mb-1">Quand consulter</Text>
      <Text className="text-gray-500 text-sm mb-3">
        THRIVE est un programme éducatif. Il ne remplace pas un avis médical, psychologique ou
        psychosocial. Arrêtez toute activité en cas de douleur ou de malaise.
      </Text>
      {RESOURCES.map((r) => (
        <Text
          key={r.tel}
          className="text-sm underline py-1"
          onPress={() => Linking.openURL(`tel:${r.tel}`)}
          accessibilityRole="link"
        >
          {r.label}
        </Text>
      ))}
    </View>
  );
}
