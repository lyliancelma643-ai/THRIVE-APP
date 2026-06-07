import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { ChevronRight, LogOut, Settings } from 'lucide-react-native';

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-primary-background">
      <GlobalHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-6 pt-10 pb-6 border-b border-surface-elevated">
          <Text className="text-white font-display text-4xl font-bold mb-2">Profil</Text>
          <Text className="text-text-muted text-base">Infos, préférences et compte.</Text>
        </View>

        {/* Sections */}
        <View className="px-6 py-6 gap-y-8">
          
          {/* Athlete Info */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Informations de l'athlète</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <ProfileRow label="Nom" value="Lylian" />
              <ProfileRow label="Âge" value="21 ans" />
              <ProfileRow label="Sport Principal" value="Athlétisme" />
              <ProfileRow label="Niveau" value="Intermédiaire" isLast />
            </View>
          </View>

          {/* Preferences */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Préférences de séances</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <ProfileRow label="Durée préférée" value="15-20 min" />
              <ProfileRow label="Objectif" value="Explosivité" isLast />
            </View>
          </View>

          {/* Account */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Compte et abonnement</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <Pressable className="flex-row justify-between items-center p-4 border-b border-surface-highlight/50 bg-surface-elevated active:bg-surface-highlight">
                <Text className="text-white font-semibold text-base">Gérer mon abonnement</Text>
                <ChevronRight color="#8f9779" size={20} />
              </Pressable>
              <Pressable className="flex-row items-center p-4 bg-surface-elevated active:bg-surface-highlight">
                <LogOut color="#ff4b4b" size={20} />
                <Text className="text-danger font-semibold text-base ml-3">Déconnexion</Text>
              </Pressable>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

function ProfileRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View className={`flex-row justify-between items-center p-4 ${isLast ? '' : 'border-b border-surface-highlight/50'}`}>
      <Text className="text-text-muted text-base">{label}</Text>
      <View className="flex-row items-center">
        <Text className="text-white font-semibold text-base mr-2">{value}</Text>
        <ChevronRight color="#8f9779" size={16} />
      </View>
    </View>
  );
}
