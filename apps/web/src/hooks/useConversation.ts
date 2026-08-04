'use client';

// Moteur d'un fil de discussion, partagé par les trois espaces.
//
// Ce que le hook garantit, et qui fait la différence entre « ça marche » et
// « c'est fluide » :
//   • le message part à l'écran AVANT la base (envoi optimiste) et se répare
//     tout seul en cas d'échec (bouton « Réessayer », rien n'est perdu) ;
//   • le temps réel dédoublonne l'écho Postgres de l'envoi optimiste ;
//   • la lecture est marquée à l'ouverture ET à chaque message reçu quand
//     l'onglet est visible — jamais quand il est en arrière-plan ;
//   • l'accusé « Lu » vient de conversation_reads (dernière lecture de l'autre) ;
//   • « en train d'écrire… » passe par un canal broadcast (aucune écriture en base).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import {
  MESSAGE_COLUMNS,
  deleteMessage,
  editMessage,
  fetchMessages,
  fetchReads,
  markConversationRead,
  othersLastRead,
  sendMessage,
  type Attachment,
  type ConversationRead,
  type Message,
  type MessagingErrorCode,
} from '@/lib/messaging';

const PAGE_SIZE = 50;
const TYPING_TIMEOUT = 4000;

export type PendingState = 'sending' | 'failed';

export type ThreadItem = Message & {
  pending?: PendingState;
  /** Brouillon conservé pour pouvoir réessayer un envoi échoué. */
  retry?: { content: string; attachment: Attachment | null };
};

export type UseConversation = {
  messages: ThreadItem[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  send: (content: string, attachment?: Attachment | null) => Promise<boolean>;
  retry: (localId: string) => Promise<void>;
  discard: (localId: string) => void;
  /** Correction d'un de mes messages (fenêtre de 15 minutes, imposée en RLS). */
  edit: (id: string, content: string) => Promise<void>;
  /** Suppression douce : la bulle devient « Message supprimé » pour tous. */
  remove: (id: string) => Promise<void>;
  error: MessagingErrorCode | null;
  clearError: () => void;
  /** Instant de lecture le plus récent des autres participants (accusé « Lu »). */
  othersReadAt: number;
  /** Un autre participant est en train d'écrire. */
  typing: boolean;
  notifyTyping: () => void;
};

function isLocal(id: string): boolean {
  return id.startsWith('local-');
}

export function useConversation(
  conversationId: string | null,
  myId: string | undefined
): UseConversation {
  const [messages, setMessages] = useState<ThreadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<MessagingErrorCode | null>(null);
  const [reads, setReads] = useState<ConversationRead[]>([]);
  const [typing, setTyping] = useState(false);

  // Miroir des messages, pour les callbacks qui doivent lire l'état courant
  // sans se re-créer à chaque nouveau message (edit/remove).
  const messagesRef = useRef<ThreadItem[]>([]);
  messagesRef.current = messages;

  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  // ── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setMessages([]);
      setReads([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      const [page, r] = await Promise.all([
        fetchMessages(conversationId, { limit: PAGE_SIZE }),
        fetchReads(conversationId),
      ]);
      if (cancelled) return;
      setMessages(page);
      setReads(r);
      setHasMore(page.length === PAGE_SIZE);
      setIsLoading(false);
      await markConversationRead(conversationId);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ── Temps réel : messages + accusés de lecture ─────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const filter = `conversation_id=eq.${conversationId}`;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            // Écho de mon propre envoi optimiste : on remplace la bulle locale.
            const localIdx = prev.findIndex(
              (m) =>
                isLocal(m.id) &&
                m.sender_id === incoming.sender_id &&
                m.content === incoming.content
            );
            if (localIdx >= 0) {
              const next = prev.slice();
              next[localIdx] = incoming;
              return next;
            }
            return [...prev, incoming];
          });
          // Un message reçu pendant que l'onglet est ouvert est un message lu.
          if (incoming.sender_id !== myId && document.visibilityState === 'visible') {
            markConversationRead(conversationId);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads', filter },
        () => {
          fetchReads(conversationId).then(setReads);
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === myId) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT);
      })
      .subscribe();

    typingChannel.current = channel;
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingChannel.current = null;
      setTyping(false);
      supabase.removeChannel(channel);
    };
  }, [conversationId, myId]);

  // Retour sur l'onglet : on rattrape ce qui est arrivé pendant l'absence.
  useEffect(() => {
    if (!conversationId) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      fetchMessages(conversationId, { limit: PAGE_SIZE }).then((page) => {
        setMessages((prev) => {
          const pending = prev.filter((m) => isLocal(m.id));
          return [...page, ...pending];
        });
      });
      markConversationRead(conversationId);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId]);

  // ── Historique ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore) return;
    const oldest = messages.find((m) => !isLocal(m.id));
    if (!oldest) return;
    const page = await fetchMessages(conversationId, {
      limit: PAGE_SIZE,
      before: oldest.created_at,
    });
    setHasMore(page.length === PAGE_SIZE);
    setMessages((prev) => [...page, ...prev]);
  }, [conversationId, hasMore, messages]);

  // ── Envoi ──────────────────────────────────────────────────────────────────
  const push = useCallback(
    async (localId: string, content: string, attachment: Attachment | null): Promise<boolean> => {
      if (!conversationId || !myId) return false;
      const { message, error: err } = await sendMessage({
        conversationId,
        senderId: myId,
        content,
        attachment,
      });
      if (err || !message) {
        setError(err ?? 'UNKNOWN');
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, pending: 'failed' } : m))
        );
        return false;
      }
      setMessages((prev) => {
        // Le temps réel a pu livrer le message avant la réponse de l'INSERT.
        if (prev.some((m) => m.id === message.id)) {
          return prev.filter((m) => m.id !== localId);
        }
        return prev.map((m) => (m.id === localId ? message : m));
      });
      return true;
    },
    [conversationId, myId]
  );

  const send = useCallback(
    async (content: string, attachment: Attachment | null = null): Promise<boolean> => {
      const body = content.trim();
      if (!conversationId || !myId || (!body && !attachment)) return false;
      setError(null);

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ThreadItem = {
        id: localId,
        conversation_id: conversationId,
        sender_id: myId,
        content: body,
        attachment_url: attachment?.path ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_type: attachment?.type ?? null,
        attachment_size: attachment?.size ?? null,
        reply_to_id: null,
        is_system: false,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        pending: 'sending',
        retry: { content: body, attachment },
      };
      setMessages((prev) => [...prev, optimistic]);
      return push(localId, body, attachment);
    },
    [conversationId, myId, push]
  );

  const retry = useCallback(
    async (localId: string) => {
      const target = messages.find((m) => m.id === localId);
      if (!target?.retry) return;
      setError(null);
      setMessages((prev) =>
        prev.map((m) => (m.id === localId ? { ...m, pending: 'sending' } : m))
      );
      await push(localId, target.retry.content, target.retry.attachment);
    },
    [messages, push]
  );

  const discard = useCallback((localId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== localId));
  }, []);

  // ── Correction et retrait ──────────────────────────────────────────────────
  // Optimistes ici aussi ; le temps réel (UPDATE) propage aux autres écrans, et
  // un refus de la RLS (au-delà de 15 minutes) restaure l'état réel.
  const edit = useCallback(async (id: string, content: string) => {
    const body = content.trim();
    if (!body || isLocal(id)) return;
    const previous = messagesRef.current.find((m) => m.id === id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: body, edited_at: new Date().toISOString() } : m))
    );
    const { error: err } = await editMessage(id, body);
    if (err) {
      setError(err);
      if (previous) setMessages((prev) => prev.map((m) => (m.id === id ? previous : m)));
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    if (isLocal(id)) return;
    const previous = messagesRef.current.find((m) => m.id === id);
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
    );
    const { error: err } = await deleteMessage(id);
    if (err) {
      setError(err);
      if (previous) setMessages((prev) => prev.map((m) => (m.id === id ? previous : m)));
    }
  }, []);

  // ── « En train d'écrire… » ─────────────────────────────────────────────────
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!typingChannel.current || !myId || now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    typingChannel.current.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
  }, [myId]);

  const othersReadAt = useMemo(() => othersLastRead(reads, myId), [reads, myId]);

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    send,
    retry,
    discard,
    edit,
    remove,
    error,
    clearError: useCallback(() => setError(null), []),
    othersReadAt,
    typing,
    notifyTyping,
  };
}

// Liste de conversations tenue à jour en direct (inbox coach / support / parent).
export function useConversationsRealtime(reload: () => void, enabled = true) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Une rafale de messages ne doit pas déclencher une rafale de requêtes.
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), 250);
    };
    const channel = supabase
      .channel(`conversations-inbox-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, debounced)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debounced)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads' },
        debounced
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}

export { MESSAGE_COLUMNS };
