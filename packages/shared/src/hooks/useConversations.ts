import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ConversationParticipant {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  family_id?: string;
  last_message_at: string;
  other: ConversationParticipant;
  unread_count: number;
  last_message?: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: convs } = await supabase
      .from('conversations')
      .select(`
        *,
        p1:profiles!conversations_participant_1_fkey(id, first_name, last_name, role),
        p2:profiles!conversations_participant_2_fkey(id, first_name, last_name, role)
      `)
      .order('last_message_at', { ascending: false });

    if (!convs) { setIsLoading(false); return; }

    // Pour chaque conversation, récupérer le dernier message + nb non lus
    const enriched = await Promise.all(
      convs.map(async (c: any) => {
        const other = c.participant_1 === user.id ? c.p2 : c.p1;
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id)
          .eq('receiver_id', user.id)
          .is('read_at', null);
        return {
          ...c,
          other,
          unread_count: count ?? 0,
          last_message: lastMsg?.content,
        };
      })
    );

    setConversations(enriched);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const getOrCreateConversation = async (otherUserId: string, familyId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    const [p1, p2] = [user.id, otherUserId].sort();

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .single();

    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ participant_1: p1, participant_2: p2, family_id: familyId })
      .select()
      .single();

    if (error) throw new Error(error.message);
    await fetch();
    return created;
  };

  return { conversations, isLoading, currentUserId, getOrCreateConversation, refetch: fetch };
}
