import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Clock } from 'lucide-react-native';

type Message = {
  id: string;
  senderType: 'parent' | 'coach' | 'system';
  text: string;
  createdAt: string;
  readAt: string | null;
};

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    senderType: 'system',
    text: 'Bienvenue dans votre messagerie Thrive. Votre coach Sarah Moreau est disponible pour répondre à vos questions en moins de 3 heures ouvrées.',
    createdAt: '10 mai 2026 · 09:00',
    readAt: '10 mai 2026 · 09:05',
  },
  {
    id: 'm2',
    senderType: 'coach',
    text: 'Bonjour ! Je suis ravie de travailler avec Emma cette saison. Elle a montré beaucoup d'enthousiasme lors de notre première séance. N'hésitez pas si vous avez des questions !',
    createdAt: '11 mai 2026 · 14:30',
    readAt: '11 mai 2026 · 18:00',
  },
  {
    id: 'm3',
    senderType: 'parent',
    text: 'Merci Sarah ! Emma est très motivée. Elle parle beaucoup de la séance sur la confiance. Est-ce qu'on peut pratiquer les exercices à la maison ?',
    createdAt: '12 mai 2026 · 10:15',
    readAt: '12 mai 2026 · 11:00',
  },
  {
    id: 'm4',
    senderType: 'coach',
    text: 'Absolument ! Je vous ai joint dans le bilan de la séance 2 des exercices spécifiques. La routine de respiration carrée est idéale le soir avant de dormir.',
    createdAt: '12 mai 2026 · 11:45',
    readAt: null,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');

  const getMessageStyle = (type: Message['senderType']) => {
    if (type === 'parent') return 'bg-primary-accent/20 self-end ml-12';
    if (type === 'coach') return 'bg-surface-elevated self-start mr-12';
    return 'bg-surface-highlight/50 self-center mx-8';
  };

  const getNameColor = (type: Message['senderType']) => {
    if (type === 'parent') return '#c5a059';
    if (type === 'coach') return '#6c8ebf';
    return '#8f9779';
  };

  return (
    <View className="flex-1 bg-primary-background">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Accueil</Text>
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold">Messages</Text>
        <View className="flex-row items-center mt-1">
          <View className="w-2 h-2 rounded-full bg-success mr-2" />
          <Text className="text-text-muted text-sm">Coach Sarah Moreau · Répond en 3h ouvrées</Text>
        </View>
      </View>

      {/* Conversation */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
        {MOCK_MESSAGES.map((msg) => (
          <View key={msg.id} className={`rounded-2xl p-4 mb-3 ${getMessageStyle(msg.senderType)}`}>
            {msg.senderType !== 'system' && (
              <Text
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: getNameColor(msg.senderType) }}
              >
                {msg.senderType === 'parent' ? 'Vous' : 'Coach Sarah'}
              </Text>
            )}
            <Text className={`leading-relaxed ${
              msg.senderType === 'system' ? 'text-text-muted text-center text-sm' : 'text-white'
            }`}>{msg.text}</Text>
            <View className="flex-row items-center justify-end mt-2">
              <Clock color="#8f9779" size={10} />
              <Text className="text-text-muted text-xs ml-1">{msg.createdAt}</Text>
            </View>
          </View>
        ))}

        {/* SLA info */}
        <View className="bg-surface-elevated/50 rounded-xl p-3 mx-4 mt-2">
          <Text className="text-text-muted text-xs text-center">
            ⏱ Disponibilité coach : lun–ven 9h–18h · Réponse garantie sous 3h ouvrées
          </Text>
        </View>
      </ScrollView>

      {/* Input */}
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="px-4 pt-3 border-t border-surface-elevated bg-primary-background"
      >
        <View className="flex-row items-end gap-x-3">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrire un message..."
            placeholderTextColor="#8f9779"
            multiline
            className="flex-1 bg-surface-elevated text-white rounded-2xl px-4 py-3 min-h-[48px] max-h-28"
          />
          <Pressable
            onPress={() => setInputText('')}
            disabled={!inputText.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              inputText.trim() ? 'bg-primary-accent' : 'bg-surface-elevated'
            }`}
          >
            <Send color={inputText.trim() ? '#1b263b' : '#8f9779'} size={20} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
