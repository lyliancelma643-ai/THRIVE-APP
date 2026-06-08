import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, LogOut, Settings, Globe, Shield, CreditCard } from 'lucide-react-native';

export default function ProfileParentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-primary-background">
      <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 border-b border-surface-elevated">
        <Pressable onPress={() => router.back()} className="mb-3 flex-row items-center">
          <ChevronLeft color="#c5a059" size={24} />
          <Text className="text-primary-accent text-sm ml-1">Accueil</Text>
        </Pressable>
        <Text className="text-white font-display text-2xl font-bold">Mon profil</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Avatar + Infos */}
        <View className="items-center py-8">
          <View className="w-20 h-20 rounded-full bg-primary-accent/20 border-2 border-primary-accent items-center justify-center mb-4">
            <Text className="font-display text-4xl font-bold text-primary-accent">L</Text>
          </View>
          <Text className="text-white font-display text-2xl font-bold">Lylian</Text>
          <Text className="text-text-muted">lylian@thrivesportpositive.com</Text>
          <View className="mt-3 bg-primary-accent/10 border border-primary-accent/30 px-4 py-2 rounded-full">
            <Text className="text-primary-accent text-sm font-bold">Pack AVANCÉ · Emma</Text>
          </View>
        </View>

        <View className="px-6 gap-y-6">

          {/* Infos personnelles */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Informations</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <SettingsRow label="Prénom" value="Lylian" />
              <SettingsRow label="Email" value="lylian@thriveapp.com" />
              <SettingsRow label="Téléphone" value="+1 514 000 0000" />
              <SettingsRow label="Langue" value="Français" icon={Globe} isLast />
            </View>
          </View>

          {/* Abonnement */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Abonnement & Pack</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <SettingsRow label="Pack actuel" value="AVANCÉ" />
              <SettingsRow label="Accès séances 20 min" value="3 mois (actif)" />
              <Pressable className="flex-row items-center p-4 active:bg-surface-highlight">
                <CreditCard color="#c5a059" size={20} />
                <Text className="text-white font-semibold text-base ml-3 flex-1">Gérer mon abonnement</Text>
                <ChevronRight color="#8f9779" size={18} />
              </Pressable>
            </View>
          </View>

          {/* Légal */}
          <View>
            <Text className="text-primary-accent text-xs font-bold uppercase tracking-widest mb-3">Légal & Confidentialité</Text>
            <View className="bg-surface-elevated rounded-2xl overflow-hidden">
              <Pressable className="flex-row items-center p-4 border-b border-surface-highlight/50 active:bg-surface-highlight">
                <Shield color="#8f9779" size={18} />
                <Text className="text-white font-semibold text-base ml-3 flex-1">Politique de confidentialité</Text>
                <ChevronRight color="#8f9779" size={18} />
              </Pressable>
              <Pressable className="flex-row items-center p-4 border-b border-surface-highlight/50 active:bg-surface-highlight">
                <Text className="text-text-muted text-base ml-0">CGU</Text>
                <ChevronRight color="#8f9779" size={18} className="ml-auto" />
              </Pressable>
              <Pressable className="flex-row items-center p-4 active:bg-surface-highlight">
                <Text className="text-text-muted text-base">Consentements (Loi 25 / RGPD)</Text>
                <ChevronRight color="#8f9779" size={18} className="ml-auto" />
              </Pressable>
            </View>
          </View>

          {/* Déconnexion */}
          <Pressable className="bg-surface-elevated rounded-2xl p-4 flex-row items-center">
            <LogOut color="#ff4b4b" size={20} />
            <Text className="text-danger font-semibold text-base ml-3">Déconnexion</Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({ label, value, icon: Icon, isLast = false }: {
  label: string; value: string; icon?: any; isLast?: boolean;
}) {
  return (
    <Pressable className={`flex-row justify-between items-center p-4 active:bg-surface-highlight ${
      isLast ? '' : 'border-b border-surface-highlight/50'
    }`}>
      <View className="flex-row items-center">
        {Icon && <Icon color="#8f9779" size={18} className="mr-3" />}
        <Text className="text-text-muted text-base">{label}</Text>
      </View>
      <View className="flex-row items-center">
        <Text className="text-white font-semibold text-base mr-2">{value}</Text>
        <ChevronRight color="#8f9779" size={16} />
      </View>
    </Pressable>
  );
}
