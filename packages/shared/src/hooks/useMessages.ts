import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Fil de messages d'une conversation — modèle de la migration 056.
// L'état de lecture n'est plus porté par chaque message (receiver_id/status)
// mais par conversation_reads (une ligne par participant) : c'est ce qui permet
// le guichet support à plusieurs agents et l'accusé « Lu » côté expéditeur.

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  reply_to_id?: string | null;
  is_system: boolean;
  edited_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
}

const COLUMNS =
  'id, conversation_id, sender_id, content, attachment_url, attachment_name, attachment_type, attachment_size, reply_to_id, is_system, edited_at, deleted_at, created_at';

export function useMessages(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from('messages')
      .select(COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages((data ?? []) as Message[]);
    setIsLoading(false);

    // Ouvrir le fil vaut lecture : une ligne conversation_reads, au lieu de N
    // updates sur les messages reçus.
    if (user) {
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    if (!conversationId) return;

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
          const incoming = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
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
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (
    content: string,
    opts?: {
      replyToId?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
      attachmentSize?: number;
    }
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !conversationId) throw new Error('Non authentifié');

    // Le destinataire se déduit de la conversation en base (trigger de
    // notification) : l'appelant n'a plus à le fournir.
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      reply_to_id: opts?.replyToId ?? null,
      attachment_url: opts?.attachmentUrl ?? null,
      attachment_name: opts?.attachmentName ?? null,
      attachment_type: opts?.attachmentType ?? null,
      attachment_size: opts?.attachmentSize ?? null,
    });
    if (error) throw new Error(error.message);
  };

  return { messages, isLoading, currentUserId, sendMessage };
}
