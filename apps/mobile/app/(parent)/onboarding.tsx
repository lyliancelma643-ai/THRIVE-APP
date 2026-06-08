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
import { useOnboarding } from '@thrive/shared';

const { width } = Dimensions.get('window');

const STEPS = [
  { id: 0, title: 'Bienvenue ! 👋', subtitle: 'Nous allons configurer votre espace famille' },
  { id: 1, title: 'Votre profil', subtitle: 'Comment souhaitez-vous être contacté(e) ?' },
  { id: 2, title: 'Votre enfant', subtitle: 'Ajoutons votre premier enfant' },
  { id: 3, title: "C'est parti ! 🎉", subtitle: 'Votre espace famille est prêt' },
];

const AGE_GROUPS = [
  '4-6 ans', '7-9 ans', '10-12 ans', '13-15 ans', '16-18 ans',
];

const SPORT_LEVELS = [
  '🌱 Débutant', '📈 Intermédiaire', '🏆 Avancé', '⭐ Compétition',
];

export default function ParentOnboarding() {
  const { user } = useAuth();
  const { updateProfile } = useProfile(user?.id);
  const { markOnboardingDone, loading: onboardingLoading } = useOnboarding(user?.id);

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [sportLevel, setSportLevel] = useState('');
  const [updating, setUpdating] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  function animate(direction: 'next' | 'prev') {
    const toOut = direction === 'next' ? -width : width;
    const fromIn = direction === 'next' ? width : -width;
    Animated.timing(slideAnim, {
      toValue: toOut,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setStep((s) => s + (direction === 'next' ? 1 : -1));
      slideAnim.setValue(fromIn);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    });
  }

  async function handleSaveStep1() {
    if (!fullName.trim()) {
      Alert.alert('Champ requis', 'Merci de renseigner votre prénom / nom.');
      return;
    }
    setUpdating(true);
    try {
      await updateProfile({ full_name: fullName, phone });
      animate('next');
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveStep2() {
    if (!childName.trim()) {
      Alert.alert('Champ requis', "Merci de renseigner le prénom de l'enfant.");
      return;
    }
    // L'ajout en DB de l'enfant est géré post-onboarding dans les paramètres famille
    // Ici on stocke juste les données localement pour l'écran de confirmation
    animate('next');
  }

  async function handleFinish() {
    setUpdating(true);
    try {
      await markOnboardingDone();
      router.replace('/(parent)/dashboard');
    } finally {
      setUpdating(false);
    }
  }

  const progressWidth = ((step + 1) / STEPS.length) * 100;
  const isLoading = updating || onboardingLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        {step > 0 && step < 3 && (
          <TouchableOpacity onPress={() => animate('prev')} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressDots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
      </View>

      {/* Contenu */}
      <Animated.View style={[styles.stepWrap, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* STEP 0 — Bienvenue */}
          {step === 0 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>👨‍👩‍👧</Text>
              <Text style={styles.title}>{STEPS[0].title}</Text>
              <Text style={styles.subtitle}>{STEPS[0].subtitle}</Text>
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  Thrive connecte votre famille avec un coach dédié pour accompagner la progression sportive de votre enfant, de façon positive et bienveillante.
                </Text>
              </View>
              <View style={styles.featuresList}>
                {[
                  { icon: '📊', text: 'Suivez la progression en temps réel' },
                  { icon: '💬', text: 'Échangez directement avec le coach' },
                  { icon: '🏅', text: 'Débloquez des badges de motivation' },
                  { icon: '📅', text: 'Consultez le programme de la semaine' },
                ].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => animate('next')}>
                <Text style={styles.btnText}>Commencer →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 1 — Profil parent */}
          {step === 1 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>👤</Text>
              <Text style={styles.title}>{STEPS[1].title}</Text>
              <Text style={styles.subtitle}>{STEPS[1].subtitle}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prénom et nom *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Marie Dupont"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Téléphone (optionnel)</Text>
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
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={handleSaveStep1}
                disabled={isLoading}
              >
                <Text style={styles.btnText}>
                  {isLoading ? 'Enregistrement...' : 'Continuer →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2 — Enfant */}
          {step === 2 && (
            <View style={styles.step}>
              <Text style={styles.emoji}>🧒</Text>
              <Text style={styles.title}>{STEPS[2].title}</Text>
              <Text style={styles.subtitle}>{STEPS[2].subtitle}</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Prénom de l'enfant *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Lucas"
                  placeholderTextColor="#9ca3af"
                  value={childName}
                  onChangeText={setChildName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tranche d'âge</Text>
                <View style={styles.chipRow}>
                  {AGE_GROUPS.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.chip, ageGroup === a && styles.chipActive]}
                      onPress={() => setAgeGroup(a)}
                    >
                      <Text style={[styles.chipText, ageGroup === a && styles.chipTextActive]}>{a}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Niveau sportif</Text>
                <View style={styles.chipRow}>
                  {SPORT_LEVELS.map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.chip, sportLevel === l && styles.chipActive]}
                      onPress={() => setSportLevel(l)}
                    >
                      <Text style={[styles.chipText, sportLevel === l && styles.chipTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.btn} onPress={handleSaveStep2}>
                <Text style={styles.btnText}>Presque là →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={() => animate('next')}>
                <Text style={styles.skipText}>Passer — j'ajouterai plus tard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3 — Confirmation */}
          {step === 3 && (
            <View style={styles.step}>
              <Text style={[styles.emoji, { fontSize: 72 }]}>🎉</Text>
              <Text style={styles.title}>{STEPS[3].title}</Text>
              <Text style={styles.subtitle}>{STEPS[3].subtitle}</Text>

              <View style={styles.card}>
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Parent</Text>
                  <Text style={styles.summaryVal}>{fullName || '—'}</Text>
                </View>
                {childName ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Enfant</Text>
                    <Text style={styles.summaryVal}>{childName}{ageGroup ? ` · ${ageGroup}` : ''}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.btn, isLoading && styles.btnDisabled]}
                onPress={handleFinish}
                disabled={isLoading}
              >
                <Text style={styles.btnText}>
                  {isLoading ? 'Finalisation...' : "Accéder à l'espace famille →"}
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
  progressDots: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b' },
  dotActive: { backgroundColor: '#10b981' },
  progressBar: { height: 3, backgroundColor: '#1e293b', marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 3, backgroundColor: '#10b981', borderRadius: 2 },
  stepWrap: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#f8fafc', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 20, width: '100%' },
  cardText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23 },
  featuresList: { width: '100%', marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  featureIcon: { fontSize: 22, marginRight: 14 },
  featureText: { color: '#e2e8f0', fontSize: 15 },
  formGroup: { width: '100%', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: '#10b981' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#6ee7b7', fontWeight: '600' },
  summaryTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  summaryKey: { color: '#64748b', fontSize: 14 },
  summaryVal: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  btn: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { paddingVertical: 12 },
  skipText: { color: '#475569', fontSize: 14 },
});
