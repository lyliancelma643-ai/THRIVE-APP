import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversations } from '@thrive/shared';
import { OfflineState } from '../../components/OfflineState';
import { SPACING, ThemedText, useTheme } from '../../design';

// U — Messages : fils avec le coach et le support THRIVE (conversations existantes).
export default function ParentMessagesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { conversations, isLoading, error, refetch } = useConversations();
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

  const getInitials = (name?: string | null) => {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase() : '?';
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped, paddingTop: insets.top + SPACING.space4 }}>
      <View style={{ paddingHorizontal: SPACING.space4, marginBottom: SPACING.space3 }}>
        <ThemedText variant="largeTitle" accessibilityRole="header">Messages</ThemedText>
        {totalUnread > 0 && (
          <ThemedText variant="subheadline" color="label2">{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</ThemedText>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator accessibilityLabel="Chargement des messages" />
      ) : error && conversations.length === 0 ? (
        <OfflineState onRetry={refetch} />
      ) : conversations.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SPACING.space8 }}>
          <Ionicons name="chatbubbles-outline" size={44} color={colors.label2} />
          <ThemedText variant="headline" style={{ marginTop: SPACING.space3 }}>Aucun message</ThemedText>
          <ThemedText variant="subheadline" color="label2">Votre coach vous écrira ici.</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.space4, paddingBottom: SPACING.space8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.label2} />}
        >
          <View style={{ backgroundColor: colors.bgGrouped2, borderRadius: 16, overflow: 'hidden' }}>
            {conversations.map((conv, i) => {
              const unread = conv.unread_count > 0;
              return (
                <Pressable
                  key={conv.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Conversation avec ${conv.counterpart_name ?? 'le support THRIVE'}${unread ? `, ${conv.unread_count} non lu${conv.unread_count > 1 ? 's' : ''}` : ''}`}
                  onPress={() => router.push(`/(parent)/chat/${conv.id}?name=${encodeURIComponent(conv.counterpart_name ?? 'THRIVE')}`)}
                  style={{
                    minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: SPACING.space3,
                    borderBottomWidth: i === conversations.length - 1 ? 0 : 0.5, borderBottomColor: colors.separator,
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: unread ? colors.tint : colors.fill3, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText variant="headline" style={{ color: unread ? colors.tintInk : colors.label }}>{getInitials(conv.counterpart_name)}</ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.space3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <ThemedText variant="subheadline" numberOfLines={1} style={{ fontWeight: unread ? '700' : '500', flex: 1 }}>
                        {conv.counterpart_name ?? 'Support THRIVE'}
                      </ThemedText>
                      <ThemedText variant="caption1" color="label2">{formatTime(conv.last_message_at)}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText variant="footnote" color={unread ? 'label' : 'label2'} numberOfLines={1} style={{ flex: 1 }}>
                        {conv.last_message_preview ?? 'Nouvelle conversation'}
                      </ThemedText>
                      {unread && (
                        <View style={{ backgroundColor: colors.tint, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, marginLeft: SPACING.space2, alignItems: 'center' }}>
                          <ThemedText variant="caption2" style={{ color: colors.tintInk }}>{conv.unread_count}</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
