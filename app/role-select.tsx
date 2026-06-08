import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Baby, ShieldCheck } from 'lucide-react-native';

const ROLES = [
  {
    key: 'athlete',
    label: 'Athlète',
    description: 'Accès au programme, séances et progression',
    icon: User,
    route: '/(tabs)' as const,
    color: '#c5a059',
  },
  {
    key: 'parent',
    label: 'Parent',
    description: 'Suivi de votre enfant, bilans, messages coach',
    icon: Baby,
    route: '/(parent)/dashboard' as const,
    color: '#5aa8c5',
  },
  {
    key: 'coach',
    label: 'Coach',
    description: 'Gestion des athlètes et du programme',
    icon: ShieldCheck,
    route: '/(tabs)' as const,
    color: '#5ac57a',
  },
] as const;

export default function RoleSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>THRIVE</Text>
      <Text style={styles.subtitle}>Choisissez votre espace</Text>
      <Text style={styles.hint}>⚠️ Sélecteur de développement — sera remplacé par l'auth Supabase</Text>

      <View style={styles.cards}>
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <TouchableOpacity
              key={role.key}
              style={[styles.card, { borderColor: role.color + '55' }]}
              onPress={() => router.replace(role.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: role.color + '22' }]}>
                <Icon color={role.color} size={28} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: role.color }]}>{role.label}</Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b263b',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    color: '#c5a059',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    color: '#cfd5e5',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.6,
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151c2b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#cfd5e5',
    fontSize: 13,
    lineHeight: 18,
  },
});
