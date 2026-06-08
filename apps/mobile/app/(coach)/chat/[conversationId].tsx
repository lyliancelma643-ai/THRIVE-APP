import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages } from '@thrive/shared';

export default function ChatScreen() {
  const { conversationId, receiverId, name } = useLocalSearchParams<{
    conversationId: string;
    receiverId: string;
    name?: string;
  }>();
  const router = useRouter();
  const { messages, isLoading, currentUserId, sendMessage } = useMessages(conversationId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !receiverId) return;
    setSending(true);
    try {
      await sendMessage(receiverId, input.trim(), { replyToId: replyTo?.id });
      setInput('');
      setReplyTo(null);
    } catch {}
    setSending(false);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item: msg, index }: { item: any; index: number }) => {
    const isMine = msg.sender_id === currentUserId;
    const prevMsg = messages[index - 1];
    const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {new Date(msg.created_at).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onLongPress={() => setReplyTo({ id: msg.id, content: msg.content })}
          style={[styles.msgRow, isMine && styles.msgRowMine]}
        >
          {msg.reply_to && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyText} numberOfLines={1}>{msg.reply_to.content}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{msg.content}</Text>
            <Text style={[styles.bubbleTime, isMine && { color: 'rgba(255,255,255,0.6)' }]}>
              {formatTime(msg.created_at)}
              {isMine && msg.status === 'READ' && ' ✓✓'}
              {isMine && msg.status === 'SENT' && ' ✓'}
            </Text>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name ?? 'Conversation'}</Text>
          <Text style={styles.headerStatus}>En ligne</Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Reply preview */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarLabel}>Répondre à :</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={styles.replyBarClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? '...' : '↑'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 12, padding: 4 },
  backArrow: { fontSize: 22, color: '#111' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700' },
  headerStatus: { fontSize: 12, color: '#10B981' },
  messagesList: { padding: 16, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { fontSize: 12, color: '#9CA3AF', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  msgRow: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 6 },
  msgRowMine: { alignItems: 'flex-end' },
  replyPreview: { backgroundColor: '#E5E7EB', borderLeftWidth: 3, borderLeftColor: '#6B7280', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 2, maxWidth: '70%' },
  replyText: { fontSize: 11, color: '#6B7280' },
  bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  bubbleMine: { backgroundColor: '#000' },
  bubbleOther: { backgroundColor: '#fff' },
  bubbleText: { fontSize: 15, color: '#111', lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'right' },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  replyBarContent: { flex: 1 },
  replyBarLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  replyBarText: { fontSize: 13, color: '#374151' },
  replyBarClose: { fontSize: 16, color: '#6B7280', paddingLeft: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 28 : 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, color: '#111' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
