import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { ProgressRing } from '../../components/ProgressRing';
import { Button } from '../../components/Button';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProgramScreen() {
  const router = useRouter();
  
  // Mock data for the 13 sessions
  const sessions = Array.from({ length: 13 }).map((_, i) => ({
    id: `prog-${i + 1}`,
    index: i + 1,
    title: `Séance ${i + 1} - ${['Force', 'Vitesse', 'Endurance', 'Mobilité'][i % 4]}`,
    duration: 15 + (i % 3) * 5,
    completed: i < 4,
    current: i === 4
  }));

  const completedCount = sessions.filter(s => s.completed).length;

  return (
    <View className="flex-1 bg-primary-background">
      <GlobalHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-6 pt-10 pb-6 border-b border-surface-elevated">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="bg-primary-accent px-3 py-1 rounded-full">
              <Text className="text-primary-background text-xs font-bold uppercase tracking-wider">Recommandé</Text>
            </View>
          </View>
          <Text className="text-white font-display text-4xl font-bold mb-2">Programme Thrive</Text>
          <Text className="text-text-muted text-base">13 séances structurées pour les jeunes athlètes.</Text>
        </View>

        {/* Progress Banner */}
        <View className="mx-6 my-8 bg-surface-elevated rounded-3xl p-6 flex-row items-center gap-6">
          <ProgressRing 
            progress={completedCount / 13} 
            size={100} 
            strokeWidth={10} 
            labelValue={Math.round((completedCount / 13) * 100)}
            labelUnit="%"
          />
          <View className="flex-1">
            <Text className="text-white font-display text-2xl font-bold mb-1">Tu progresses !</Text>
            <Text className="text-text-muted text-sm mb-4">{completedCount} séances complétées sur 13.</Text>
            <Button 
              label="Continuer" 
              size="sm" 
              onPress={() => router.push(`/player/${sessions.find(s => s.current)?.id}`)} 
              className="w-full mb-3"
            />
            <Button 
              label="Recommencer" 
              variant="danger_outline" 
              size="sm" 
              onPress={() => {}} 
              className="w-full"
            />
          </View>
        </View>

        {/* Session List */}
        <View className="px-6 pb-8">
          {sessions.map((session, index) => (
            <Pressable 
              key={session.id}
              onPress={() => router.push(`/session/${session.id}`)}
              className={`flex-row items-center p-4 rounded-2xl mb-3 ${session.current ? 'bg-surface-elevated border border-primary-accent' : 'bg-surface-elevated'}`}
            >
              {({ pressed }) => (
                <View className={`flex-row items-center w-full ${pressed ? 'opacity-70' : 'opacity-100'}`}>
                  <View className="mr-4">
                    {session.completed ? (
                      <CheckCircle2 color="#c5a059" size={28} />
                    ) : session.current ? (
                      <Circle color="#c5a059" size={28} />
                    ) : (
                      <Circle color="#8f9779" size={28} strokeWidth={1.5} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold text-lg ${session.completed ? 'text-white' : session.current ? 'text-primary-accent' : 'text-text-muted'}`}>
                      {session.index}. {session.title}
                    </Text>
                    <Text className="text-text-subtle text-sm">{session.duration} min</Text>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
