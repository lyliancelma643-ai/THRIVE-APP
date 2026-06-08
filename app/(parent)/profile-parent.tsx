import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, CreditCard, FileText, Shield, Bell,
  ChevronRight, LogOut, Award,
} from 'lucide-react-native';

const C = {
  bg: '#1b263b', surface: '#151c2b', elevated: '#1f2d42',
  accent: '#c5a059', blue: '#5aa8c5', red: '#e05252',
  textPrimary: '#ffffff', textMuted: '#cfd5e5', textFaint: '#7a8aaa',
};

const SECTIONS = [
  {
    title: 'Mon compte',
    items: [
      { icon: User, label: 'Informations personnelles', sub: 'Marie Dubois · marie@email.com' },
      { icon: Bell, label: 'Notifications', sub: 'Bilans, séances, messages' },
    ],
  },
  {
    title: 'Abonnement',
    items: [
      { icon: Award, label: 'Pack actuel', sub: 'Performance · 2 enfants', accent: true },
      { icon: CreditCard, label: 'Facturation', sub: 'Prochain prélèvement : 1er juillet' },
    ],
  },
  {
    title: 'Légal & Confidentialité',
    items: [
      { icon: FileText, label: 'Conditions générales', sub: 'CGU · Politique de confidentialité' },
      { icon: Shield, label: 'Droits RGPD / Loi 25', sub: 'Accès, rectification, suppression' },
    ],
  },
];

export default function ParentProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: () => router.replace('/role-select') },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon profil</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <Text style={styles.name}>Marie Dubois</Text>
          <View style={styles.packBadge}>
            <Award color={C.accent} size={13} />
            <Text style={styles.packText}>Pack Performance</Text>
          </View>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity key={item.label} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={[styles.iconWrap, item.accent && { backgroundColor: C.accent + '22' }]}>
                      <Icon color={item.accent ? C.accent : C.textMuted} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{item.label}</Text>
                      <Text style={styles.rowSub}>{item.sub}</Text>
                    </View>
                    <ChevronRight color={C.textFaint} size={16} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut color={C.red} size={18} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>THRIVE App · v1.0.0 · Espace parent</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.surface },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '800' },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.accent + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: C.accent, fontSize: 30, fontWeight: '800' },
  name: { color: C.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  packBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  packText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { color: C.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sectionCard: { backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.elevated },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.elevated },
  iconWrap: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  rowSub: { color: C.textFaint, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.red + '18', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: C.red + '44',
  },
  logoutText: { color: C.red, fontSize: 15, fontWeight: '700' },
  versionText: { color: C.textFaint, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
