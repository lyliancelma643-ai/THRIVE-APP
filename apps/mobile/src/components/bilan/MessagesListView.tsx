import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Avatar, Icon, LargeTitle, List, ListRow, NavBar, Section, ThemedText, useLargeTitle, useNavBarHeight, useTheme } from '../../design';

// Messages : fils avec le coach et le support THRIVE (liste des conversations). Vue PRÉSENTATIONNELLE.

export type ConversationItem = {
  id: string;
  name: string;
  preview: string;
  stamp: string;
  unread: number;
};

export type MessagesListViewProps = {
  items: ConversationItem[];
  totalUnread: number;
  onOpen: (c: ConversationItem) => void;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase() : '?';
};

export function MessagesListView({ items, totalUnread, onOpen, onRefresh, refreshing }: MessagesListViewProps) {
  const { colors } = useTheme();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="messages">
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 32 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.label2} /> : undefined}
      >
        <LargeTitle subtitle={totalUnread > 0 ? `${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : undefined}>Messages</LargeTitle>
        {items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 }}>
            <Icon name="chat" size={40} color={colors.label3} />
            <ThemedText variant="headline" style={{ marginTop: 12 }}>Aucun message</ThemedText>
            <ThemedText variant="sub" color="label2">Votre coach vous écrira ici.</ThemedText>
          </View>
        ) : (
          <Section style={{ marginTop: 14 }}>
            <List>
              {items.map((c) => (
                <ListRow
                  key={c.id}
                  leading={<Avatar label={initials(c.name)} size={44} background={c.unread > 0 ? colors.tint : colors.fill} ink={c.unread > 0 ? colors.tintInk : colors.label} />}
                  leadingInset={72}
                  title={c.name}
                  subtitle={c.preview}
                  value={c.stamp}
                  accessory={c.unread > 0 ? (
                    <View style={{ backgroundColor: colors.tint, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
                      <ThemedText variant="cap2" style={{ color: colors.tintInk }}>{c.unread}</ThemedText>
                    </View>
                  ) : undefined}
                  chevron
                  onPress={() => onOpen(c)}
                  accessibilityLabel={`Conversation avec ${c.name}${c.unread > 0 ? `, ${c.unread} non lu${c.unread > 1 ? 's' : ''}` : ''}`}
                />
              ))}
            </List>
          </Section>
        )}
      </ScrollView>
      <NavBar title="Messages" titleVisible={lt.titleVisible} edge={lt.edge} />
    </View>
  );
}
