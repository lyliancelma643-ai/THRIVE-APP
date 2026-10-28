import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages, supabaseClient as supabase } from '@thrive/shared';
import { ThreadView, type ThreadMessage } from '../../../components/bilan/ThreadView';
import { usePack } from '../../../components/hub/bilan/data';

// U — fil de messages du parent (vue dédiée : components/bilan/ThreadView). La logique est celle du chat existant :
// destinataire déduit de la conversation en base (migration 056), réponse à un message, signalement et blocage
// (Apple 1.2 — tables message_reports et conversation_blocks, migration 077).
// Fil COACH sans messagerie coach dans le forfait : lecture seule, comme le refuse le serveur
// (private.can_write_conversation exige coachMessaging) — jamais un champ actif qui échoue en silence.

const COACH_LOCKED_TEXT = 'La messagerie avec le coach s’ouvre avec le forfait Complet. Le Support THRIVE reste ouvert.';

type RawMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: string;
  reply_to?: { content: string } | null;
};

export default function ParentChatScreen() {
  const { conversationId, name, draft } = useLocalSearchParams<{ conversationId: string; name?: string; draft?: string }>();
  const router = useRouter();
  const { messages, isLoading, currentUserId, sendMessage } = useMessages(conversationId);
  // `draft` : message pré-rempli (ex. demande de changement de forfait), envoyé seulement si le parent touche Envoyer.
  const [input, setInput] = useState(typeof draft === 'string' ? draft : '');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  // `blocked` = j'ai bloqué ce fil (ligne visible par moi seul, RLS) ; `blockedByOther` = envoi refusé par le serveur.
  const [blocked, setBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [isCoachThread, setIsCoachThread] = useState(false);
  const { can, loaded: packLoaded } = usePack(null);
  const coachLocked = isCoachThread && packLoaded && !can('coachMessaging');

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    supabase
      .from('conversations')
      .select('kind')
      .eq('id', conversationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsCoachThread((data as { kind?: string } | null)?.kind === 'COACH');
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    let cancelled = false;
    supabase
      .from('conversation_blocks')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('blocker_id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBlocked(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId]);

  const handleSend = async () => {
    if (!input.trim() || coachLocked) return;
    setSending(true);
    try {
      await sendMessage(input.trim(), { replyToId: replyTo?.id });
      setInput('');
      setReplyTo(null);
    } catch (e: unknown) {
      if (String((e as { message?: string })?.message ?? '').includes('Conversation bloquée')) setBlockedByOther(true);
      // Le texte reste dans le champ : le parent peut réessayer sans le retaper.
      else Alert.alert('Message non envoyé', 'Vérifie ta connexion et réessaie. Si le problème persiste, écris au Support THRIVE.');
    }
    setSending(false);
  };

  const unblockConversation = () =>
    Alert.alert('Débloquer la conversation', 'Les messages pourront de nouveau être envoyés dans cette conversation.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Débloquer',
        onPress: async () => {
          const { error } = await supabase.from('conversation_blocks').delete().eq('conversation_id', conversationId).eq('blocker_id', currentUserId);
          if (error) {
            Alert.alert('Erreur', "Le déblocage n'a pas pu être appliqué. Réessayez.");
            return;
          }
          setBlocked(false);
          setBlockedByOther(false);
        },
      },
    ]);

  const reportMessage = async (messageId: string, reason: string) => {
    const { error } = await supabase.from('message_reports').insert({
      message_id: messageId,
      conversation_id: conversationId,
      reporter_id: currentUserId,
      reason,
    });
    Alert.alert(
      error?.code === '23505' ? 'Déjà signalé' : error ? 'Erreur' : 'Message signalé',
      error?.code === '23505'
        ? 'Vous avez déjà signalé ce message.'
        : error
          ? "Le signalement n'a pas pu être envoyé. Réessayez."
          : "Merci. Notre équipe l'examinera sous 24 h.",
    );
  };

  const askReportReason = (messageId: string) =>
    Alert.alert('Signaler ce message', 'Pour quelle raison ?', [
      { text: 'Harcèlement ou menaces', onPress: () => reportMessage(messageId, 'HARCELEMENT') },
      { text: 'Contenu inapproprié', onPress: () => reportMessage(messageId, 'INAPPROPRIE') },
      { text: 'Spam', onPress: () => reportMessage(messageId, 'SPAM') },
      { text: 'Autre', onPress: () => reportMessage(messageId, 'AUTRE') },
      { text: 'Annuler', style: 'cancel' },
    ]);

  const blockConversation = () =>
    Alert.alert('Bloquer la conversation', "Plus aucun message ne pourra être envoyé dans cette conversation, ni par vous ni par l'autre personne.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('conversation_blocks').insert({ conversation_id: conversationId, blocker_id: currentUserId });
          if (error && error.code !== '23505') {
            Alert.alert('Erreur', "Le blocage n'a pas pu être appliqué. Réessayez.");
            return;
          }
          setBlocked(true);
        },
      },
    ]);

  const openMessageMenu = (msg: ThreadMessage) => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Répondre', onPress: () => setReplyTo({ id: msg.id, content: msg.content }) },
    ];
    if (!msg.mine) options.push({ text: 'Signaler', style: 'destructive', onPress: () => askReportReason(msg.id) });
    options.push(blocked ? { text: 'Débloquer la conversation', onPress: unblockConversation } : { text: 'Bloquer la conversation', style: 'destructive', onPress: blockConversation });
    options.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  };

  const title = name ?? (isCoachThread ? 'Ton coach THRIVE' : 'Conversation');
  return (
    <ThreadView
      title={title}
      initial={title.trim().charAt(0).toUpperCase() || '?'}
      loading={isLoading}
      messages={(messages as RawMessage[]).map((m) => ({
        id: m.id,
        content: m.content,
        mine: m.sender_id === currentUserId,
        created_at: m.created_at,
        read: m.status === 'READ',
        replyTo: m.reply_to?.content ?? null,
      }))}
      input={input}
      onInput={setInput}
      onSend={handleSend}
      sending={sending}
      replyTo={replyTo?.content ?? null}
      onCancelReply={() => setReplyTo(null)}
      onLongPress={openMessageMenu}
      blockedText={
        blocked
          ? 'Vous avez bloqué cette conversation. Aucun message ne peut y être envoyé.'
          : blockedByOther
            ? "Cette conversation n'accepte plus de messages."
            : coachLocked
              ? COACH_LOCKED_TEXT
              : null
      }
      blockedTitle={!blocked && !blockedByOther && coachLocked ? 'Lecture seule' : undefined}
      onUnblock={blocked ? unblockConversation : undefined}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(parent)/messages'))}
    />
  );
}
