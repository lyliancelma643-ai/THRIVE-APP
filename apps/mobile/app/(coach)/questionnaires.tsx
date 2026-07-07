import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useQuestionnaires } from '@thrive/shared';
import { useSessions } from '@thrive/shared';

const QUESTION_TYPES = [
  { value: 'scale', label: '📊 Échelle (1-10)' },
  { value: 'yes_no', label: '✅ Oui / Non' },
  { value: 'multiple_choice', label: '📝 Choix multiple' },
  { value: 'text', label: '✍️ Texte libre' },
];

export default function CoachQuestionnairesScreen() {
  const { questionnaires, isLoading, createQuestionnaire } = useQuestionnaires();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    { text: '', type: 'scale' as const, options: [] as string[], order_index: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', type: 'scale', options: [], order_index: questions.length },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Titre requis'); return; }
    if (questions.some((q) => !q.text.trim())) {
      Alert.alert('Toutes les questions doivent avoir un texte');
      return;
    }
    setSaving(true);
    try {
      await createQuestionnaire(title, questions, { description });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setQuestions([{ text: '', type: 'scale', options: [], order_index: 0 }]);
      Alert.alert('✅ Questionnaire créé !');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Questionnaires</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setShowModal(true)}>
          <Text style={styles.btnText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : questionnaires.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>Aucun questionnaire</Text>
          <Text style={styles.emptySubtext}>Créez votre premier questionnaire psychoéducatif</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {questionnaires.map((q) => (
            <View key={q.id} style={styles.card}>
              <Text style={styles.cardTitle}>{q.title}</Text>
              {q.description && <Text style={styles.cardDesc}>{q.description}</Text>}
              <Text style={styles.cardMeta}>
                {q.questions?.length ?? 0} question{(q.questions?.length ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal création */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau questionnaire</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtn}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Bien-être séance 1"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description optionnelle..."
            multiline
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Questions</Text>
          {questions.map((q, index) => (
            <View key={index} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNum}>Q{index + 1}</Text>
                {questions.length > 1 && (
                  <TouchableOpacity onPress={() => removeQuestion(index)}>
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={q.text}
                onChangeText={(v) => updateQuestion(index, 'text', v)}
                placeholder="Texte de la question..."
              />
              <View style={styles.typeRow}>
                {QUESTION_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeBtn, q.type === t.value && styles.typeBtnActive]}
                    onPress={() => updateQuestion(index, 'type', t.value)}
                  >
                    <Text style={[styles.typeBtnText, q.type === t.value && styles.typeBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
            <Text style={styles.addQuestionText}>+ Ajouter une question</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={saving}
          >
            <Text style={styles.submitText}>{saving ? 'Création...' : 'Créer le questionnaire'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700' },
  btn: { backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },
  card: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  modal: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  closeBtn: { color: '#6B7280', fontSize: 16 },
  label: { fontSize: 13, color: '#6B7280', marginHorizontal: 20, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginHorizontal: 20 },
  questionCard: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  questionNum: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  typeBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6' },
  typeBtnActive: { backgroundColor: '#000' },
  typeBtnText: { fontSize: 11, color: '#6B7280' },
  typeBtnTextActive: { color: '#fff' },
  addQuestionBtn: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#000', borderStyle: 'dashed', alignItems: 'center' },
  addQuestionText: { color: '#000', fontWeight: '600' },
  submitBtn: { margin: 16, backgroundColor: '#000', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 40 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
