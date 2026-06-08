import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, Image, StyleSheet,
} from 'react-native'
import { useAuth } from '../../packages/shared/src/hooks/useAuth'
import { useMessaging, type Conversation, type Message } from '../../packages/shared/src/hooks/useMessaging'

export default function CoachMessagingScreen() {
  const { user } = useAuth()
  const {
    conversations, messages, activeConversationId, loading, sending,
    openConversation, sendMessage, fetchConversations, markAsRead,
  } = useMessaging(user?.id || '')

  const [inputText, setInputText] = useState('')
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId)
    }
  }, [messages.length, activeConversationId])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  const handleSend = async () => {
    if (!inputText.trim()) return
    const text = inputText
    setInputText('')
    await sendMessage(text)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (!activeConversationId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtitle}>Vos échanges avec les parents apparaîtront ici</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }: { item: Conversation }) => (
              <TouchableOpacity
                style={styles.convItem}
                onPress={() => openConversation(item.id)}
              >
                <View style={styles.avatarContainer}>
                  {item.other_user?.avatar_url ? (
                    <Image source={{ uri: item.other_user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {item.other_user?.full_name?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  {(item.unread_count || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convRow}>
                    <Text style={styles.convName}>{item.other_user?.full_name || 'Parent'}</Text>
                    <Text style={styles.convTime}>
                      {item.last_message ? formatDate(item.last_message.created_at) : ''}
                    </Text>
                  </View>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.last_message?.content || 'Démarrer la conversation...'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    )
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => { fetchConversations() }} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.chatTitle}>{activeConv?.other_user?.full_name || 'Conversation'}</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          renderItem={({ item }: { item: Message }) => {
            const isMe = item.sender_id === user?.id
            return (
              <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                  {item.content}
                </Text>
                <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            )
          }}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrire un message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>→</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 15, color: '#6366F1', fontWeight: '600' },
  chatTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  convItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: '#6366F1' },
  unreadBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadCount: { fontSize: 10, color: '#fff', fontWeight: '700' },
  convInfo: { flex: 1 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  convTime: { fontSize: 12, color: '#9CA3AF' },
  lastMessage: { fontSize: 13, color: '#6B7280' },
  messageBubble: { maxWidth: '80%', marginVertical: 4, padding: 12, borderRadius: 16 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#fff' },
  theirText: { color: '#111827' },
  messageTime: { fontSize: 11, marginTop: 4 },
  myTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  theirTime: { color: '#9CA3AF', textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827', maxHeight: 120, marginRight: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#C7D2FE' },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' },
})
