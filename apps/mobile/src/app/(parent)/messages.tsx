import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversations } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { LockedSection } from '../../components/access/LockedSection';
import { MessagesListView } from '../../components/bilan/MessagesListView';
import { useSubscriptionStore } from '../../stores/subscription.store';
import { sectionView } from '../../services/access';

// U — Messages : fils avec le coach et le support THRIVE (conversations existantes). Sans conversation ET sans
// aucun accès coach (Bilan et Séances verrouillés, lus dans access_state()), l'aperçu « Écrire à un coach » s'affiche.

export default function ParentMessagesScreen() {
  const router = useRouter();
  const { conversations, isLoading, error, refetch } = useConversations();
  const access = useSubscriptionStore((st) => st.access);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'maintenant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  };

  if (isLoading) return <ActivityIndicator accessibilityLabel="Chargement des messages" style={{ marginTop: 96 }} />;
  if (error && conversations.length === 0) return <OfflineState onRetry={refetch} />;

  const noCoachAccess = !!access && !access.isStaff && sectionView(access, 'bilan') === 'locked' && sectionView(access, 'seances') === 'locked';
  if (conversations.length === 0 && noCoachAccess) {
    return <LockedSection section="messages" />;
  }

  return (
    <MessagesListView
      items={conversations.map((c) => ({
        id: c.id,
        name: c.counterpart_name ?? 'Support THRIVE',
        preview: c.last_message_preview ?? 'Nouvelle conversation',
        stamp: formatTime(c.last_message_at),
        unread: c.unread_count,
      }))}
      totalUnread={conversations.reduce((sum, c) => sum + c.unread_count, 0)}
      onOpen={(c) => router.push(`/(parent)/chat/${c.id}?name=${encodeURIComponent(c.name)}`)}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}
