import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Clock } from 'lucide-react-native';

const INITIAL_MESSAGES = [
  { id: '1', from: 'coach', name: 'Coach Sarah', text: 'Bonjour ! Emma a très bien progressé cette semaine, son engagement est remarquable. 💪', time: 'Lun 10h14', read: true },
  { id: '2', from: 'parent', name: 'Vous', text: 'Merci ! Elle était très enthousiaste après la séance de lundi.', time: 'Lun 10h32', read: true },
  { id: '3', from: 'coach', name: 'Coach Sarah', text: 'Excellent signe. Son bilan de mi-parcours sera disponible vendredi. Je vous enverrai un résumé détaillé.', time: 'Lun 11h05', read: true },
  { id: '4', from: 'coach', name: 'Coach Sarah', text: 'Pour la séance de jeudi, pensez à lui rappeler d'apporter ses chaussures de sport.', time: 'Mar 9h20', read: false },
  { id: '5', from: 'coach', name: 'Coach Sarah', text: 'Avez-vous des questions avant le bilan de vendredi ?', time: 'Mar 14h03', read: false },
];

const C = {
  bg: '#1b263b', surface: '#151c2b', elevated: '#1f2d42',
  accent: '#c5a059', blue: '#5aa8c5',
  textPrimary: '#ffffff', textMuted: '#cfd5e5', textFaint: '#7a8aaa',
};

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), from: 'parent', name: 'Vous', text: input.trim(), time: 'maintenant', read: true },
    ]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Coach Sarah</Text>
          <Text style={styles.sub}>Emma · Programme 13 séances</Text>
        </View>
        <View style={styles.slaBadge}>
          <Clock color={C.blue} size={12} />
          <Text style={styles.slaText}>Rép. sous 3h ouvrées</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.messageList}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubbleWrap, msg.from === 'parent' && styles.bubbleWrapRight]}>
            {msg.from === 'coach' && (
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarSmallText}>S</Text>
              </View>
            )}
            <View style={[
              styles.bubble,
              msg.from === 'parent' ? styles.bubbleParent : styles.bubbleCoach,
            ]}>
              <Text style={styles.bubbleText}>{msg.text}</Text>
              <Text style={styles.bubbleTime}>{msg.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
          placeholderTextColor={C.textFaint}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Send color="#1b263b" size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.surface,
  },
  title: { color: C.textPrimary, fontSize: 17, fontWeight: '700' },
  sub: { color: C.textFaint, fontSize: 12, marginTop: 2 },
  slaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.blue + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  slaText: { color: C.blue, fontSize: 11, fontWeight: '600' },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  bubbleWrapRight: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.blue + '33', alignItems: 'center', justifyContent: 'center',
  },
  avatarSmallText: { color: C.blue, fontSize: 12, fontWeight: '700' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%' },
  bubbleCoach: { backgroundColor: C.surface, borderTopLeftRadius: 4 },
  bubbleParent: { backgroundColor: C.accent + '22', borderTopRightRadius: 4 },
  bubbleText: { color: C.textPrimary, fontSize: 14, lineHeight: 20 },
  bubbleTime: { color: C.textFaint, fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.surface, backgroundColor: C.bg,
  },
  input: {
    flex: 1, backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: C.textPrimary, fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
});
