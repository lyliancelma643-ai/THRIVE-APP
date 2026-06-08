import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@thrive/shared';
import { useProfile } from '@thrive/shared';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 0, title: 'Bienvenue ! 👋', subtitle: 'Configurons votre espace famille' },
  { id: 1, title: 'Votre profil', subtitle: 'Vos informations de contact' },
  { id: 2, title: 'Votre enfant', subtitle: 'Parlez-nous de votre enfant' },
  { id: 3, title: 'C\'est parti ! 🎉', subtitle: 'Votre espace famille est prêt' },
];

const GOALS = [
  '💪 Améliorer la condition physique',
  '🏆 Préparer une compétition',
  '🎯 Développer une discipline',
  '😊 Bien-être et épanouissement',
  '📚 Apprentissage d\'un sport',
  '🧘 Gestion du stress',
];

export default function ParentOnboarding() {
  const { user } = useAuth();
  const { updateProfile, completeOnboarding, updating } = useProfile(user?.id);

  const [step, setStep] = useState(0);
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
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

  function toggleGoal(g: string) {
    setSelectedGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }

  async function handleSaveStep1() {
    if (!parentName.trim()) {
      Alert.alert('Champ requis', 'Merci de renseigner votre nom.');
      return;
    }
    await updateProfile({ full_name: parentName, phone });
    goNext();
  }

  async function handleFinish() {
    await completeOnboarding();
    router.replace('/(parent)/dashboard');
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

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
      </View>

      <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>🏡</Text>
              <Text style={styles.stepTitle}>{STEPS[0].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[0].subtitle}</Text>
              <View style={styles.welcomeCard}>
                <Text style={styles.welcomeText}>
                  Thrive vous permet de suivre la progression de votre enfant, communiquer avec son coach et l\'encourager à chaque étape de son parcours.
                </Text>
              </View>
              <View style={styles.welcomeFeatures}>
                {[
                  { icon: '📈', text: 'Suivi de progression en temps réel' },
                  { icon: '💬', text: 'Contact direct avec le coach' },
                  { icon: '🏅', text: 'Badges et récompenses' },
                  { icon: '📅', text: 'Planning des séances' },
                ].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
                <Text style={styles.primaryBtnText}>Commencer →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 1 — Profil parent */}
          {step === 1 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>👤</Text>
              <Text style={styles.stepTitle}>{STEPS[1].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[1].subtitle}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Votre prénom et nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Marie Martin"
                  placeholderTextColor="#9ca3af"
                  value={parentName}
                  onChangeText={setParentName}
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

          {/* STEP 2 — Enfant */}
          {step === 2 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>🧒</Text>
              <Text style={styles.stepTitle}>{STEPS[2].title}</Text>
              <Text style={styles.stepSubtitle}>{STEPS[2].subtitle}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prénom de l\'enfant *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Léo"
                  placeholderTextColor="#9ca3af"
                  value={childName}
                  onChangeText={setChildName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Âge</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12"
                  placeholderTextColor="#9ca3af"
                  value={childAge}
                  onChangeText={setChildAge}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <Text style={styles.sectionLabel}>Objectifs</Text>
              <View style={styles.goalsGrid}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.goalChip,
                      selectedGoals.includes(g) && styles.goalChipActive,
                    ]}
                    onPress={() => toggleGoal(g)}
                  >
                    <Text
                      style={[
                        styles.goalText,
                        selectedGoals.includes(g) && styles.goalTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
                onPress={() => {
                  if (!childName.trim()) {
                    Alert.alert('Champ requis', "Merci d'entrer le prénom de votre enfant.");
                    return;
                  }
                  goNext();
                }}
              >
                <Text style={styles.primaryBtnText}>Presque terminé →</Text>
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
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Parent</Text>
                  <Text style={styles.summaryValue}>{parentName || '—'}</Text>
                </View>
                {childName ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Enfant</Text>
                    <Text style={styles.summaryValue}>{childName}{childAge ? `, ${childAge} ans` : ''}</Text>
                  </View>
                ) : null}
                {selectedGoals.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Objectifs</Text>
                    <Text style={styles.summaryValue}>{selectedGoals.length} sélectionné(s)</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, updating && styles.primaryBtnDisabled]}
                onPress={handleFinish}
                disabled={updating}
              >
                <Text style={styles.primaryBtnText}>
                  {updating ? 'Finalisation...' : 'Voir le tableau de bord →'}
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
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b' },
  progressDotActive: { backgroundColor: '#10b981' },
  progressBar: { height: 3, backgroundColor: '#1e293b', marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#10b981', borderRadius: 2 },
  stepContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 16 },
  emojiLarge: { fontSize: 72 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  welcomeCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 20, width: '100%' },
  welcomeText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23 },
  welcomeFeatures: { width: '100%', marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  featureIcon: { fontSize: 22, marginRight: 14 },
  featureText: { color: '#e2e8f0', fontSize: 15 },
  formGroup: { width: '100%', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  sectionLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 14, alignSelf: 'flex-start' },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28, width: '100%' },
  goalChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  goalChipActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981' },
  goalText: { color: '#94a3b8', fontSize: 14 },
  goalTextActive: { color: '#6ee7b7', fontWeight: '600' },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  summaryTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  summaryLabel: { color: '#64748b', fontSize: 14 },
  summaryValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  primaryBtn: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 12 },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 12 },
  skipText: { color: '#475569', fontSize: 14 },
});
