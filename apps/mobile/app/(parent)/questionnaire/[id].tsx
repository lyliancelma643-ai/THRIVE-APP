import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@thrive/shared';
import { useQuestionnaires } from '@thrive/shared';
import { useChildBadges } from '@thrive/shared';

export default function QuestionnaireResponseScreen() {
  const { id, childId } = useLocalSearchParams<{ id: string; childId: string }>();
  const router = useRouter();
  const { questionnaires, isLoading, submitResponse } = useQuestionnaires();
  const { checkAndAwardBadges } = useChildBadges(childId);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questionnaire = questionnaires.find((q) => q.id === id);

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!questionnaire || !childId) return;
    const unanswered = (questionnaire.questions ?? []).filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      Alert.alert('Incomplet', `Il reste ${unanswered.length} question(s) sans réponse.`);
      return;
    }
    setSubmitting(true);
    try {
      await submitResponse(questionnaire.id, childId, answers);
      await checkAndAwardBadges(childId);
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSubmitting(false);
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!questionnaire) return (
    <View style={styles.center}>
      <Text>Questionnaire introuvable.</Text>
    </View>
  );

  if (submitted) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 64 }}>🎉</Text>
      <Text style={styles.successTitle}>Questionnaire terminé !</Text>
      <Text style={styles.successSub}>Merci pour tes réponses 😊</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{questionnaire.title}</Text>
        {questionnaire.description && (
          <Text style={styles.desc}>{questionnaire.description}</Text>
        )}
      </View>

      {(questionnaire.questions ?? []).map((question, index) => (
        <View key={question.id} style={styles.questionCard}>
          <Text style={styles.questionNum}>Question {index + 1}</Text>
          <Text style={styles.questionText}>{question.text}</Text>

          {question.type === 'scale' && (
            <View>
              <Text style={styles.scaleLabel}>Réponse : {answers[question.id] ?? '—'}/10</Text>
              <View style={styles.scaleRow}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.scaleBtn, answers[question.id] === n && styles.scaleBtnActive]}
                    onPress={() => setAnswer(question.id, n)}
                  >
                    <Text style={[styles.scaleBtnText, answers[question.id] === n && { color: '#fff' }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {question.type === 'yes_no' && (
            <View style={styles.yesNoRow}>
              {['Oui', 'Non'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.yesNoBtn, answers[question.id] === opt && styles.yesNoBtnActive]}
                  onPress={() => setAnswer(question.id, opt)}
                >
                  <Text style={[styles.yesNoBtnText, answers[question.id] === opt && { color: '#fff' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {question.type === 'multiple_choice' && (
            <View>
              {(question.options ?? []).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.choiceBtn, answers[question.id] === opt && styles.choiceBtnActive]}
                  onPress={() => setAnswer(question.id, opt)}
                >
                  <Text style={[styles.choiceBtnText, answers[question.id] === opt && { color: '#fff' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {question.type === 'text' && (
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={(answers[question.id] as string) ?? ''}
              onChangeText={(v) => setAnswer(question.id, v)}
              placeholder="Ta réponse..."
              multiline
            />
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Envoi...' : 'Valider mes réponses ✅'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  successSub: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  header: { backgroundColor: '#fff', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backArrow: { color: '#6B7280', fontSize: 14, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 14, color: '#6B7280' },
  questionCard: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 16, padding: 16 },
  questionNum: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  questionText: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  scaleLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  scaleBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  scaleBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  yesNoRow: { flexDirection: 'row', gap: 12 },
  yesNoBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center' },
  yesNoBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  yesNoBtnText: { fontWeight: '600', color: '#374151' },
  choiceBtn: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', marginBottom: 8 },
  choiceBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  choiceBtnText: { fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#F9FAFB' },
  submitBtn: { margin: 20, backgroundColor: '#000', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 60 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: 20, backgroundColor: '#000', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
