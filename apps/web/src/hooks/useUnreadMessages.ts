'use client';

// Compteur de messages non lus pour les barres de navigation (pastille sur
// l'icône « Messages »). Une seule source : la RPC my_unread_messages, qui ne
// compte QUE les fils dont je suis destinataire — la supervision admin des
// échanges coach ↔ parent n'allume jamais la pastille.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { countUnreadMessages } from '@/lib/messaging';

export function useUnreadMessages(enabled = true): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setCount(await countUnreadMessages());
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, 300);
    };
    const channel = supabase
      .channel('unread-messages-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debounced)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_reads' },
        debounced
      )
      .subscribe();

    // Retour sur l'onglet : la pastille reflète l'état réel, pas celui d'il y a
    // une heure (un événement temps réel a pu être manqué en veille).
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  return count;
}
