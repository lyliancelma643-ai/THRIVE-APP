import React, { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import {
  Avatar, CANVAS, GlassButton, GlassSurface, Icon, NavBar, ThemedText, resolveTextStyle, useNavBarHeight, useTheme,
} from '../../design';
import { Bubble } from './Bubble';

// U — Messages : le fil avec le coach (bulles, saisie en verre). Vue PRÉSENTATIONNELLE : la route (chat/[conversationId])
// garde la logique existante (useMessages, signalement, blocage). Le « + » (pièces jointes) n'existe pas dans le produit.

export type ThreadMessage = {
  id: string;
  content: string;
  mine: boolean;
  created_at: string;
  /** Message de l'enfant lu par le coach. */
  read?: boolean;
  replyTo?: string | null;
};

export type ThreadViewProps = {
  title: string;
  initial: string;
  messages: ThreadMessage[];
  input: string;
  onInput: (t: string) => void;
  onSend: () => void;
  sending?: boolean;
  /** Fil bloqué : bandeau à la place de la saisie. */
  blockedText?: string | null;
  onUnblock?: () => void;
  replyTo?: string | null;
  onCancelReply?: () => void;
  onLongPress?: (m: ThreadMessage) => void;
  onBack: () => void;
  loading?: boolean;
};

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayText = (iso: string) => {
  const t = new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function ThreadView(p: ThreadViewProps) {
  const { colors, fontsLoaded, style } = useTheme();
  const navH = useNavBarHeight();
  const list = useRef<FlatList>(null);
  const body = resolveTextStyle('body', fontsLoaded, style);
  const canSend = p.input.trim().length > 0 && !p.sending;
  const lastMine = [...p.messages].reverse().find((m) => m.mine);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgGrouped }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} testID="fil-coach">
      <FlatList
        ref={list}
        data={p.messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{ paddingTop: navH + 10, paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
        renderItem={({ item, index }) => {
          const prev = p.messages[index - 1];
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(item.created_at);
          return (
            <View style={{ gap: 8 }}>
              {newDay ? (
                <ThemedText variant="foot" color="label2" style={{ textAlign: 'center', marginTop: 4, marginBottom: 6 }}>{dayText(item.created_at)}</ThemedText>
              ) : null}
              <Pressable onLongPress={p.onLongPress ? () => p.onLongPress!(item) : undefined} accessibilityHint={p.onLongPress ? 'Appui long pour répondre, signaler ou bloquer' : undefined}>
                {item.replyTo ? (
                  <ThemedText variant="cap" color="label2" numberOfLines={1} style={{ alignSelf: item.mine ? 'flex-end' : 'flex-start', maxWidth: '70%', marginBottom: 2 }}>↩ {item.replyTo}</ThemedText>
                ) : null}
                <Bubble side={item.mine ? 'out' : 'in'}>{item.content}</Bubble>
              </Pressable>
              {item.id === lastMine?.id && item.read ? (
                <ThemedText variant="cap" color="label2" style={{ alignSelf: 'flex-end', marginTop: -2 }}>Lu</ThemedText>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={p.loading ? null : <ThemedText variant="sub" color="label2" style={{ textAlign: 'center', marginTop: 40 }}>Écrivez votre premier message.</ThemedText>}
      />

      {p.replyTo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}>
          <ThemedText variant="foot" color="label2" numberOfLines={1} style={{ flex: 1 }}>Répondre à : {p.replyTo}</ThemedText>
          <Pressable onPress={p.onCancelReply} accessibilityRole="button" accessibilityLabel="Annuler la réponse" hitSlop={10}>
            <Icon name="close" size={16} color={colors.label2} />
          </Pressable>
        </View>
      ) : null}

      {p.blockedText ? (
        <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline">Conversation bloquée</ThemedText>
            <ThemedText variant="foot" color="label2">{p.blockedText}</ThemedText>
          </View>
          {p.onUnblock ? <GlassButton label="Débloquer" accessibilityLabel="Débloquer la conversation" onPress={p.onUnblock} /> : null}
        </View>
      ) : (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <GlassSurface radius={22}>
            <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, gap: 8 }}>
              <TextInput
                value={p.input}
                onChangeText={p.onInput}
                placeholder="Message"
                placeholderTextColor={colors.label3}
                multiline
                numberOfLines={1}
                maxLength={1000}
                accessibilityLabel="Message"
                style={[{ flex: 1, maxHeight: 120, color: colors.label, paddingVertical: 10 }, body, { outlineStyle: 'none' } as never]}
              />
              <Pressable
                onPress={p.onSend}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', opacity: canSend ? 1 : 0.4 }}
              >
                <Icon name="arrowUp" size={18} color={colors.tintInk} strokeWidth={2.4} />
              </Pressable>
            </View>
          </GlassSurface>
        </View>
      )}

      <NavBar
        edge
        left={<GlassButton glyph="chevronLeft" accessibilityLabel="Retour" onPress={p.onBack} />}
        title={undefined}
      />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: navH, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 13, zIndex: 41 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Avatar label={p.initial} size={28} background={colors.sysIndigo} ink={CANVAS.white} />
          <ThemedText variant="headline" numberOfLines={1} style={{ maxWidth: 200 }}>{p.title}</ThemedText>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
