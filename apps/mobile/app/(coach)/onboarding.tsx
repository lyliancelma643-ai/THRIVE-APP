import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@thrive/shared';
import { useProfile } from '@thrive/shared';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 0, title: 'Bienvenue ! 👋', subtitle: 'Commençons par faire connaissance' },
  { id: 1, title: 'Votre profil', subtitle: 'Ces infos seront visibles par les familles' },
  { id: 2, title: 'Votre spécialité', subtitle: 'Pour mieux vous mettre en relation' },
  { id: 3, title: 'Tout est prêt ! 🎉', subtitle: 'Votre espace coach est configuré' },
];

const SPECIALTIES = [
  '🏋️ Musculation', '🏃 Course à pied', '🧘 Yoga / Pilates',
  '🥊 Arts martiaux', '⚽ Football', '🏊 Natation',
  '🚴 Cyclisme', '🎾 Tennis', '🏀 Basketball', '🍎 Nutrition',
];

export default function CoachOnboarding() {
  const { user } = useAuth();
  const { updateProfile, completeOnboarding, updating } = useProfile(user?.id);

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  function goNext() {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setStep((s) => s + 1);
      slideAnim.setValue(width);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  }

  function goPrev() {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setStep((s) => s - 1);
      slideAnim.setValue(-width);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
  }

  function toggleSpecialty(s: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleSaveStep1() {
    if (!fullName.trim()) {
      Alert.alert('Champ requis', 'Merci de renseigner votre nom complet.');
      return;
    }
    await updateProfile({ full_name: fullName, phone });
    goNext();
  }

  async function handleSaveStep2() {
    await updateProfile({ avatar_url: undefined }); // bio stored separately if needed
    goNext();
  }

  async function handleFinish() {
    await completeOnboarding();
    router.replace('/(coach)/dashboard');
  }

  const progressWidth = ((step + 1) / STEPS.length) * 100;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        {step > 0 && step < 3 && (
          <TouchableOpacity onPress={goPrev} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressContainer}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
      </View>

      {/* Steps */}
      <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>🌟</Text>
              <Text style={styles.stepTitle}>{STEPS[0].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[0].subtitle}</Text>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeText}>
                  Thrive vous permet de gérer vos athlètes, créer des programmes personnalisés et suivre leur progression en temps réel.
                </Text>
              </View>
              <View style={styles.welcomeFeatures}>
                {[
                  { icon: '📋', text: 'Créez des programmes sur mesure' },
                  { icon: '💬', text: 'Communiquez avec les familles' },
                  { icon: '📊', text: 'Suivez les performances' },
                  { icon: '🔔', text: 'Notifications en temps réel' },
                ].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
                <Text style={styles.primaryBtnText}>Commencer la configuration →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 1 — Profil */}
          {step === 1 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>👤</Text>
              <Text style={styles.stepTitle}>{STEPS[1].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[1].subtitle}</Text>

              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                </Text>
                <TouchableOpacity style={styles.avatarEditBtn}>
                  <Text style={styles.avatarEditIcon}>📷</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom complet *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jean Dupont"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+33 6 00 00 00 00"
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Présentation courte</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Décrivez votre approche en quelques mots..."
                  placeholderTextColor="#9ca3af"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
                onPress={handleSaveStep1}
                disabled={updating}
              >
                <Text style={styles.primaryBtnText}>
                  {updating ? 'Enregistrement...' : 'Continuer →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2 — Spécialité */}
          {step === 2 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>🎯</Text>
              <Text style={styles.stepTitle}>{STEPS[2].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[2].subtitle}</Text>

              <Text style={styles.sectionLabel}>Sélectionnez vos domaines</Text>
              <View style={styles.specialtyGrid}>
                {SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.specialtyChip,
                      selectedSpecialties.includes(s) && styles.specialtyChipActive,
                    ]}
                    onPress={() => toggleSpecialty(s)}
                  >
                    <Text
                      style={[
                        styles.specialtyText,
                        selectedSpecialties.includes(s) && styles.specialtyTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
                onPress={handleSaveStep2}
                disabled={updating}
              >
                <Text style={styles.primaryBtnText}>
                  {updating ? 'Enregistrement...' : 'Presque terminé →'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={goNext}>
                <Text style={styles.skipText}>Passer cette étape</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3 — Done */}
          {step === 3 && (
            <View style={styles.step}>
              <Text style={[styles.emoji, styles.emojiLarge]}>🎉</Text>
              <Text style={styles.stepTitle}>{STEPS[3].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[3].subtitle}</Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Votre profil coach</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nom</Text>
                  <Text style={styles.summaryValue}>{fullName || '—'}</Text>
                </View>
                {phone ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Téléphone</Text>
                    <Text style={styles.summaryValue}>{phone}</Text>
                  </View>
                ) : null}
                {selectedSpecialties.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Spécialités</Text>
                    <Text style={styles.summaryValue}>
                      {selectedSpecialties.length} sélectionnée(s)
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
                onPress={handleFinish}
                disabled={updating}
              >
                <Text style={styles.primaryBtnText}>
                  {updating ? 'Finalisation...' : 'Accéder à mon espace →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: { marginRight: 12 },
  backIcon: { color: '#94a3b8', fontSize: 22 },
  progressContainer: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#1e293b',
  },
  progressDotActive: { backgroundColor: '#6366f1' },
  progressBar: {
    height: 3,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  stepContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 16 },
  emojiLarge: { fontSize: 72 },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  welcomeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '100%',
  },
  welcomeText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23 },
  welcomeFeatures: { width: '100%', marginBottom: 32 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  featureIcon: { fontSize: 22, marginRight: 14 },
  featureText: { color: '#e2e8f0', fontSize: 15 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    position: 'relative',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
  },
  avatarEditIcon: { fontSize: 16 },
  formGroup: { width: '100%', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: { height: 88, textAlignVertical: 'top' },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
    width: '100%',
  },
  specialtyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  specialtyChipActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: '#6366f1',
  },
  specialtyText: { color: '#94a3b8', fontSize: 14 },
  specialtyTextActive: { color: '#a5b4fc', fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  summaryTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  summaryLabel: { color: '#64748b', fontSize: 14 },
  summaryValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 12 },
  skipText: { color: '#475569', fontSize: 14 },
});
