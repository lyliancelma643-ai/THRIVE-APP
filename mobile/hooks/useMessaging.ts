import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface Conversation {
  id: string
  coach_id: string
  parent_id: string
  child_id: string | null
  last_message_at: string
  coach: { first_name: string; last_name: string; avatar_url: string | null }
  parent: { first_name: string; last_name: string; avatar_url: string | null }
  last_message?: Message
  unread_count?: number
}

export function useConversations() {
  const { user, profile } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const field = profile?.role === 'coach' ? 'coach_id' : 'parent_id'
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        coach:profiles!conversations_coach_id_fkey(first_name,last_name,avatar_url),
        parent:profiles!conversations_parent_id_fkey(first_name,last_name,avatar_url)
      `)
      .eq(field, user.id)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }, [user, profile])

  useEffect(() => { load() }, [load])

  return { conversations, loading, refresh: load }
}

export function useMessages(conversationId: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    load()
    // Abonnement Realtime
    channelRef.current = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [conversationId, load])

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
  }, [user, conversationId])

  const markRead = useCallback(async () => {
    if (!user) return
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false)
  }, [user, conversationId])

  return { messages, loading, sendMessage, markRead }
}
