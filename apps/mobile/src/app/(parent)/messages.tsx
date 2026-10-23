import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { MessagesListView, type ConversationItem } from '../../components/bilan/MessagesListView';
import { useSelectedChild } from '../../stores/child.store';
import { usePack } from '../../components/hub/bilan/data';
import { useHub } from '../../components/hub/HubProvider';

// U — Messages (le rond de la barre d'onglets) : comme sur le web, deux fils toujours présents —
//   • le coach de l'enfant (ouvert si un coach est attribué et si le forfait inclut la messagerie coach),
//   • le Support THRIVE (toujours ouvert, quel que soit le forfait : les infos, l'aide).
// Les fils sont créés au besoin (RPC get_or_create_*_conversation) ; les autres conversations suivent.

type CoachState = { id: string | null; reason: 'NO_COACH' | 'FEATURE_LOCKED' | null };

const formatTime = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'maintenant';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

export default function ParentMessagesScreen() {
  const router = useRouter();
  const child = useSelectedChild();
  const { can } = usePack(child?.id ?? null);
  const canCoach = can('coachMessaging');
  const { conversations, isLoading, error, refetch, openCoachConversation, openSupportConversation } = useConversations();
  const { refresh: refreshBadges } = useHub();
  const [supportId, setSupportId] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachState>({ id: null, reason: null });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = await openSupportConversation().catch(() => null);
      if (cancelled) return;
      setSupportId(support);
      if (child?.id && canCoach) {
        const id = await openCoachConversation(child.id).catch(() => null);
        if (!cancelled) setCoach({ id, reason: id ? null : 'NO_COACH' });
      } else if (!cancelled) {
        setCoach({ id: null, reason: child?.id ? 'FEATURE_LOCKED' : 'NO_COACH' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Les deux RPC sont stables pour un même compte : on ne rouvre que si l'enfant ou le droit change.
  }, [child?.id, canCoach]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    refreshBadges();
    setRefreshing(false);
  }, [refetch, refreshBadges]);

  if (isLoading && conversations.length === 0) return <ActivityIndicator accessibilityLabel="Chargement des messages" style={{ marginTop: 96 }} />;
  if (error && conversations.length === 0 && !supportId) return <OfflineState onRetry={refetch} />;

  const byId = (id: string | null) => conversations.find((c) => c.id === id) ?? null;
  const coachConv = byId(coach.id);
  const supportConv = byId(supportId);
  const toItem = (c: NonNullable<ReturnType<typeof byId>>, name: string): ConversationItem => ({
    id: c.id,
    name,
    preview: c.last_message_preview ?? 'Nouvelle conversation',
    stamp: formatTime(c.last_message_at),
    unread: c.unread_count,
  });

  const items: ConversationItem[] = [
    coachConv
      ? toItem(coachConv, coachConv.coach_name ?? coachConv.counterpart_name ?? 'Ton coach THRIVE')
      : {
          id: 'coach',
          name: 'Ton coach THRIVE',
          preview:
            coach.reason === 'FEATURE_LOCKED'
              ? 'La messagerie avec le coach s’ouvre avec le forfait Complet.'
              : `Disponible dès qu’un coach sera attribué${child ? ` à ${child.first_name}` : ''}.`,
          stamp: '',
          unread: 0,
          disabled: true,
        },
    supportConv
      ? toItem(supportConv, 'Support THRIVE')
      : { id: supportId ?? 'support', name: 'Support THRIVE', preview: 'Assistance · réponse sous un jour ouvrable', stamp: '', unread: 0, disabled: !supportId },
    ...conversations
      .filter((c) => c.id !== coach.id && c.id !== supportId)
      .map((c) => toItem(c, c.counterpart_name ?? 'Support THRIVE')),
  ];

  return (
    <MessagesListView
      items={items}
      totalUnread={conversations.reduce((sum, c) => sum + c.unread_count, 0)}
      onOpen={(c) => router.push(`/(parent)/chat/${c.id}?name=${encodeURIComponent(c.name)}`)}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}
