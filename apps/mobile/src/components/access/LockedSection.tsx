import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { COACH_CALL_URL, PROGRAM_VIDEO_URL } from '../../services/access';

// Onglet Bilan / Séances verrouillé (abonné Maison seul, aucun droit, fermeture
// Super Admin). Le contenu est un SQUELETTE FACTICE flouté : aucune donnée
// réelle n'est chargée (la RLS les refuse de toute façon, migration 080).
//
// Anti-steering Apple 3.1.1 / Google Play : aucun paiement, aucun prix, aucun
// lien vers le site des packs. « Découvrir le programme » n'apparaît que si une
// page vidéo dédiée est configurée ; « Rencontrer un coach » ouvre la page de
// rendez-vous configurée, sinon la messagerie de l'app.

const COPY = {
  bilan: {
    title: 'Le Bilan de votre enfant',
    body: 'Le suivi avant / après du programme, avec votre coach.',
  },
  seances: {
    title: 'Mes séances',
    body: 'Les séances avec un coach, en groupe ou en individuel.',
  },
} as const;

function Skeleton() {
  return (
    <View className="px-6 pt-4" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className="h-36 rounded-2xl bg-white border border-gray-100 mb-4" />
      <View className="flex-row mb-4">
        <View className="flex-1 h-24 rounded-2xl bg-white border border-gray-100 mr-2" />
        <View className="flex-1 h-24 rounded-2xl bg-white border border-gray-100 ml-2" />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-16 rounded-2xl bg-white border border-gray-100 mb-3 flex-row items-center px-4">
          <View className="w-9 h-9 rounded-full bg-gray-200" />
          <View className="h-3 w-1/2 rounded bg-gray-200 ml-3" />
        </View>
      ))}
    </View>
  );
}

export function LockedSection({ section }: { section: 'bilan' | 'seances' }) {
  const router = useRouter();
  const copy = COPY[section];
  return (
    <View className="flex-1 bg-gray-50" testID={`locked-${section}`}>
      <View className="pt-16">
        <Skeleton />
      </View>
      <BlurView intensity={30} tint="light" className="absolute inset-0" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View className="absolute inset-0 justify-center px-6" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View className="bg-white rounded-3xl p-6 border border-gray-100 items-center">
          <View className="w-12 h-12 rounded-full bg-yellow-100 items-center justify-center">
            <Ionicons name="lock-closed" size={22} color="#92400e" />
          </View>
          <Text className="text-xl font-bold mt-4 text-center" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text className="text-gray-600 mt-2 text-center">{copy.body}</Text>

          {PROGRAM_VIDEO_URL && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(PROGRAM_VIDEO_URL as string)}
              className="mt-6 w-full rounded-full bg-black py-4 items-center"
              accessibilityRole="button"
              accessibilityLabel="Découvrir le programme, vidéo de 5 minutes"
            >
              <Text className="text-white font-semibold">Découvrir le programme</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() =>
              COACH_CALL_URL ? WebBrowser.openBrowserAsync(COACH_CALL_URL) : router.push('/(parent)/messages')
            }
            className={`${PROGRAM_VIDEO_URL ? 'mt-3' : 'mt-6'} w-full rounded-full border border-gray-300 py-4 items-center`}
            accessibilityRole="button"
            accessibilityLabel="Rencontrer un coach, appel de 15 minutes"
          >
            <Text className="font-semibold">Rencontrer un coach</Text>
          </Pressable>
          <Text className="text-xs text-gray-500 mt-3 text-center">Appel de 15 minutes, sans engagement.</Text>
        </View>
      </View>
    </View>
  );
}

/** Pack terminé : historique consultable, rien de nouveau. */
export function ReadOnlyNotice() {
  return (
    <View className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 mb-4 flex-row">
      <Ionicons name="lock-closed" size={18} color="#92400e" />
      <Text className="text-gray-700 ml-3 flex-1">
        Votre programme est terminé. L’historique reste consultable ; rien de nouveau ne s’y ajoute.
      </Text>
    </View>
  );
}
