import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  coach_id: string
  parent_id: string
  child_id: string | null
  created_at: string
  updated_at: string
  other_user?: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  }
  last_message?: Message
  unread_count?: number
}

interface UseMessagingReturn {
  conversations: Conversation[]
  messages: Message[]
  activeConversationId: string | null
  loading: boolean
  sending: boolean
  error: string | null
  fetchConversations: () => Promise<void>
  openConversation: (conversationId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  startConversation: (otherUserId: string, childId?: string) => Promise<string>
  markAsRead: (conversationId: string) => Promise<void>
}

export function useMessaging(currentUserId: string): UseMessagingReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('conversations')
        .select(`
          *,
          coach:profiles!conversations_coach_id_fkey(id, full_name, avatar_url, role),
          parent:profiles!conversations_parent_id_fkey(id, full_name, avatar_url, role)
        `)
        .or(`coach_id.eq.${currentUserId},parent_id.eq.${currentUserId}`)
        .order('updated_at', { ascending: false })

      if (err) throw err

      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUser = conv.coach_id === currentUserId ? conv.parent : conv.coach

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', conv.id)
            .neq('sender_id', currentUserId)
            .is('read_at', null)

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMsg || undefined,
            unread_count: unreadCount || 0,
          } as Conversation
        })
      )

      setConversations(enriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des conversations')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId)
    setLoading(true)
    setError(null)

    // Désabonner du précédent canal
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
    }

    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (err) throw err
      setMessages(data || [])

      // Souscrire au realtime
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message])
          }
        )
        .subscribe()

      channelRef.current = channel
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des messages')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return
    setSending(true)
    setError(null)
    try {
      const { error: err } = await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        sender_id: currentUserId,
        content: content.trim(),
      })
      if (err) throw err
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }, [activeConversationId, currentUserId])

  const startConversation = useCallback(async (otherUserId: string, childId?: string): Promise<string> => {
    setError(null)
    try {
      // Vérifier si une conversation existe déjà
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(coach_id.eq.${currentUserId},parent_id.eq.${otherUserId}),` +
          `and(coach_id.eq.${otherUserId},parent_id.eq.${currentUserId})`
        )
        .maybeSingle()

      if (existing) return existing.id

      // Déterminer les rôles
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single()

      const isCoach = myProfile?.role === 'coach'

      const { data: newConv, error: err } = await supabase
        .from('conversations')
        .insert({
          coach_id: isCoach ? currentUserId : otherUserId,
          parent_id: isCoach ? otherUserId : currentUserId,
          child_id: childId || null,
        })
        .select()
        .single()

      if (err) throw err
      await fetchConversations()
      return newConv.id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création de la conversation')
      throw e
    }
  }, [currentUserId, fetchConversations])

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .is('read_at', null)
    } catch (e) {
      console.error('markAsRead error:', e)
    }
  }, [currentUserId])

  useEffect(() => {
    fetchConversations()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchConversations])

  return {
    conversations,
    messages,
    activeConversationId,
    loading,
    sending,
    error,
    fetchConversations,
    openConversation,
    sendMessage,
    startConversation,
    markAsRead,
  }
}
