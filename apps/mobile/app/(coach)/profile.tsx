import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@thrive/shared';
import { useProfile } from '@thrive/shared';

export default function CoachProfile() {
  const { user, signOut } = useAuth();
  const { profile, loading, updating, updateProfile } = useProfile(user?.id);

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setPushEnabled(profile.notification_prefs?.push ?? true);
      setEmailEnabled(profile.notification_prefs?.email ?? true);
      setSmsEnabled(profile.notification_prefs?.sms ?? false);
    }
  }, [profile]);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide.');
      return;
    }
    const { error } = await updateProfile({
      full_name: fullName,
      phone,
      notification_prefs: { push: pushEnabled, email: emailEnabled, sms: smsEnabled },
    });
    if (error) {
      Alert.alert('Erreur', error);
    } else {
      setEditMode(false);
      Alert.alert('✅ Sauvegardé', 'Votre profil a été mis à jour.');
    }
  }

  async function handleSignOut() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon profil</Text>
          <TouchableOpacity
            style={[styles.editBtn, editMode && styles.editBtnActive]}
            onPress={() => {
              if (editMode) {
                setFullName(profile?.full_name || '');
                setPhone(profile?.phone || '');
              }
              setEditMode(!editMode);
            }}
          >
            <Text style={[styles.editBtnText, editMode && styles.editBtnTextActive]}>
              {editMode ? 'Annuler' : 'Modifier'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{profile?.full_name || 'Coach'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>⚡ Coach</Text>
          </View>
        </View>

        {/* Infos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMATIONS</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                placeholderTextColor="#4b5563"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.full_name || '—'}</Text>
            )}
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldValue, styles.fieldValueMuted]}>{user?.email || '—'}</Text>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#4b5563"
                placeholder="+33 6 00 00 00 00"
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phone || '—'}</Text>
            )}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

          {[
            { label: 'Notifications push', value: pushEnabled, setter: setPushEnabled, icon: '🔔' },
            { label: 'Notifications email', value: emailEnabled, setter: setEmailEnabled, icon: '📧' },
            { label: 'Notifications SMS', value: smsEnabled, setter: setSmsEnabled, icon: '💬' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                  <Text style={styles.toggleIcon}>{item.icon}</Text>
                  <Text style={styles.toggleLabel}>{item.label}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={editMode ? item.setter : undefined}
                  trackColor={{ false: '#374151', true: 'rgba(99,102,241,0.4)' }}
                  thumbColor={item.value ? '#6366f1' : '#6b7280'}
                  disabled={!editMode}
                />
              </View>
              {i < 2 && <View style={styles.fieldDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STATISTIQUES</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Athlètes', value: '—' },
              { label: 'Programmes', value: '—' },
              { label: 'Séances', value: '—' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Save button */}
        {editMode && (
          <View style={styles.saveSection}>
            <TouchableOpacity
              style={[styles.saveBtn, updating && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={updating}
            >
              <Text style={styles.saveBtnText}>
                {updating ? 'Enregistrement...' : '✓ Enregistrer les modifications'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => Alert.alert('À venir', 'Changement de mot de passe via email.')}>
            <Text style={styles.actionIcon}>🔑</Text>
            <Text style={styles.actionText}>Changer le mot de passe</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.fieldDivider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
            <Text style={styles.actionIcon}>🚪</Text>
            <Text style={[styles.actionText, styles.actionTextDanger]}>Se déconnecter</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.fieldDivider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Suppression', 'Contactez le support pour supprimer votre compte.')}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionText, styles.actionTextDanger]}>Supprimer le compte</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thrive v1.0.0 — Membre depuis {new Date(profile?.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#f8fafc' },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  editBtnActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1' },
  editBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  editBtnTextActive: { color: '#a5b4fc' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  avatarName: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  roleBadgeText: { color: '#a5b4fc', fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: { color: '#94a3b8', fontSize: 15 },
  fieldValue: { color: '#f8fafc', fontSize: 15, fontWeight: '500' },
  fieldValueMuted: { color: '#64748b' },
  fieldInput: {
    color: '#f8fafc',
    fontSize: 15,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#6366f1',
    paddingBottom: 4,
  },
  fieldDivider: { height: 1, backgroundColor: '#334155', marginHorizontal: 16 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { fontSize: 18 },
  toggleLabel: { color: '#e2e8f0', fontSize: 15 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { color: '#f8fafc', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 12 },
  saveSection: { marginHorizontal: 16, marginBottom: 16 },
  saveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIcon: { fontSize: 18, marginRight: 12 },
  actionText: { color: '#e2e8f0', fontSize: 15, flex: 1 },
  actionTextDanger: { color: '#f87171' },
  actionChevron: { color: '#475569', fontSize: 18 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: '#334155', fontSize: 12 },
});
