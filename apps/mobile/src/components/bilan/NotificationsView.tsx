import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  GlassButton, Icon, LargeTitle, List, ListRow, NavBar, Section, SectionHeader, ThemedText, useCardShadow, useLargeTitle,
  useNavBarHeight, useTheme, type IconName,
} from '../../design';
import { NOTIF_BUCKET_LABEL, groupNotifications, notifStamp } from './bilanData';

// V — Notifications, groupées (Aujourd'hui · Cette semaine · Plus tôt), pastille non lue (point soleil cerclé, comme le canevas), chaque ligne mène au bon endroit.
// Vue PRÉSENTATIONNELLE : la route garde la lecture, la suppression et la navigation (data.path → route, ?focus=…).

export type NotifItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  created_at: string;
  is_read: boolean;
};

// `.ibadge.lg` : pastille ronde sauge (`badgeBg` + `badgeInk`), même pour tous les types ; seul le glyphe change.
const VISUAL: Record<string, { glyph: IconName }> = {
  MESSAGE: { glyph: 'chat' },
  SESSION: { glyph: 'document' },
  PROGRAM: { glyph: 'pulse' },
  BADGE: { glyph: 'gift' },
  SYSTEM: { glyph: 'document' },
};

export type NotificationsViewProps = {
  items: NotifItem[];
  unreadCount: number;
  loading?: boolean;
  /** Réglage système des notifications push (null = inconnu : rangée masquée). */
  pushEnabled: boolean | null;
  onTogglePush: () => void;
  onBack: () => void;
  onReadAll: () => void;
  onOpen: (n: NotifItem) => void;
  onDelete: (n: NotifItem) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Maintenant (fixtures). */
  now?: Date;
};

function NotifRow({ n, bucket, last, onOpen, onDelete }: { n: NotifItem; bucket: 'today' | 'week' | 'older'; last?: boolean; onOpen: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const v = VISUAL[n.type] ?? VISUAL.SYSTEM;
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`${n.is_read ? '' : 'Non lue : '}${n.title}`}
      accessibilityHint="Appuyez pour ouvrir, appui long pour supprimer"
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill3 : 'transparent' })}
    >
      <View style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {!n.is_read ? (
          <View
            style={{
              position: 'absolute', left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
              borderWidth: 1.5, borderColor: 'rgba(0,49,76,0.25)', boxSizing: 'content-box',
            } as never}
          />
        ) : null}
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.badgeBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={v.glyph} size={22} color={colors.badgeInk} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 11 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <ThemedText variant="body" weight={n.is_read ? 400 : 700} numberOfLines={1} style={{ flex: 1 }}>{n.title}</ThemedText>
            <ThemedText variant="foot" color="label2">{notifStamp(n.created_at, bucket)}</ThemedText>
          </View>
          {n.body ? <ThemedText variant="sub" color="label2" numberOfLines={2}>{n.body}</ThemedText> : null}
        </View>
        {!last ? <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, right: 0, left: 72, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} /> : null}
      </View>
    </Pressable>
  );
}

export function NotificationsView(p: NotificationsViewProps) {
  const { colors, metrics } = useTheme();
  const shadow = useCardShadow();
  const navH = useNavBarHeight();
  const lt = useLargeTitle(34);
  const groups = groupNotifications(p.items, p.now);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgGrouped }} testID="notifications">
      <ScrollView
        onScroll={lt.onScroll}
        scrollEventThrottle={lt.scrollEventThrottle}
        contentContainerStyle={{ paddingTop: navH, paddingBottom: 40 }}
        refreshControl={p.onRefresh ? <RefreshControl refreshing={!!p.refreshing} onRefresh={p.onRefresh} tintColor={colors.label2} /> : undefined}
      >
        <LargeTitle>Notifications</LargeTitle>
        {groups.length === 0 && !p.loading ? (
          <View style={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 }}>
            <Icon name="bell" size={40} color={colors.label3} />
            <ThemedText variant="headline" style={{ marginTop: 12 }}>Aucune notification</ThemedText>
            <ThemedText variant="sub" color="label2">Vous êtes à jour.</ThemedText>
          </View>
        ) : null}
        {groups.map((g) => (
          <View key={g.bucket}>
            <SectionHeader small title={NOTIF_BUCKET_LABEL[g.bucket]} />
            <Section>
              <View style={[{ backgroundColor: colors.bgGrouped2, borderRadius: metrics.rowRadius }, shadow]}>
                <View style={{ borderRadius: metrics.rowRadius, overflow: 'hidden' }}>
                  {g.items.map((n, i) => (
                    <NotifRow key={n.id} n={n} bucket={g.bucket} last={i === g.items.length - 1} onOpen={() => p.onOpen(n)} onDelete={() => p.onDelete(n)} />
                  ))}
                </View>
              </View>
            </Section>
          </View>
        ))}
        {p.pushEnabled !== null ? (
          <Section style={{ marginTop: 22 }}>
            <List>
              <ListRow
                title="Notifications push"
                subtitle="Sur cet appareil"
                toggle={{ value: p.pushEnabled, onChange: p.onTogglePush }}
              />
            </List>
          </Section>
        ) : null}
      </ScrollView>
      <NavBar
        title="Notifications"
        titleVisible={lt.titleVisible}
        edge={lt.edge}
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={p.onBack} />}
        right={p.unreadCount > 0 ? <GlassButton label="Tout lire" accessibilityLabel="Tout marquer comme lu" onPress={p.onReadAll} /> : undefined}
      />
    </View>
  );
}
