import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  read_at?: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'file' | 'audio';
  reply_to_id?: string;
  reply_to?: Message;
  created_at: string;
}

export function useMessages(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setIsLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from('messages')
      .select('*, reply_to:messages!reply_to_id(id, content, sender_id)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
    setIsLoading(false);

    // Marquer les messages reçus comme lus
    if (user) {
      await supabase
        .from('messages')
        .update({ status: 'READ', read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', user.id)
        .is('read_at', null);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    if (!conversationId) return;

    // Souscription Realtime
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
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (
    receiverId: string,
    content: string,
    opts?: { replyToId?: string; attachmentUrl?: string; attachmentType?: 'image' | 'file' | 'audio' }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !conversationId) throw new Error('Non authentifié');

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      status: 'SENT',
      reply_to_id: opts?.replyToId,
      attachment_url: opts?.attachmentUrl,
      attachment_type: opts?.attachmentType,
    });
    if (error) throw new Error(error.message);
  };

  return { messages, isLoading, currentUserId, sendMessage };
}
