import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';

// Liste des fils de discussion — modèle de la migration 056 :
//   conversations.kind = COACH (parent ↔ coach attribué) | SUPPORT (parent ↔ THRIVE).
// Tout est servi par la RPC list_my_conversations : non-lus, aperçu du dernier
// message et libellé de l'interlocuteur sont calculés en base (une requête, pas
// une par conversation comme dans la version précédente).

export type ConversationKind = 'COACH' | 'SUPPORT';
export type ConversationStatus = 'OPEN' | 'CLOSED';

export interface Conversation {
  id: string;
  kind: ConversationKind;
  status: ConversationStatus;
  parent_id: string;
  coach_id: string | null;
  child_id: string | null;
  assigned_admin_id: string | null;
  subject: string | null;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_id: string | null;
  unread_count: number;
  counterpart_name: string | null;
  counterpart_role: 'COACH' | 'SUPPORT' | 'PARENT';
  child_name: string | null;
  parent_name: string | null;
  coach_name: string | null;
}

export function useConversations(scope: 'mine' | 'support' | 'supervision' = 'mine') {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    const { data } = await supabase.rpc('list_my_conversations', { p_scope: scope });
    setConversations((data ?? []) as Conversation[]);
    setIsLoading(false);
  }, [scope]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  /** Fil avec le coach de l'enfant (null si aucun coach n'est encore attribué). */
  const openCoachConversation = async (childId: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_or_create_coach_conversation', {
      p_child_id: childId,
    });
    if (error) throw new Error(error.message);
    await fetch();
    return (data as string | null) ?? null;
  };

  /** Guichet support du parent connecté — ouvert quel que soit le forfait. */
  const openSupportConversation = async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_or_create_support_conversation');
    if (error) throw new Error(error.message);
    await fetch();
    return (data as string | null) ?? null;
  };

  return {
    conversations,
    isLoading,
    currentUserId,
    openCoachConversation,
    openSupportConversation,
    refetch: fetch,
  };
}
