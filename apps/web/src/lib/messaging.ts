// Messagerie THRIVE — accès aux données, partagé par les trois espaces
// (parent, coach, admin/support).
//
// Modèle (migration 056) :
//   • conversations.kind = COACH (parent ↔ coach attribué) | SUPPORT (parent ↔ THRIVE)
//   • un fil COACH par (parent, coach, enfant) ; UN SEUL fil SUPPORT par parent
//   • conversation_reads : dernière lecture par participant → non-lus + accusé « Lu »
//
// Toute la logique sensible vit en base : ouverture des fils par RPC
// (get_or_create_*), droits en RLS. Ce module ne fait que parler à ces RPC et
// traduire les erreurs Postgres en messages lisibles.

import { supabaseClient as supabase } from '@thrive/shared';

export const ATTACHMENT_BUCKET = 'message-attachments';
export const MESSAGE_MAX_LENGTH = 4000;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 Mo (aligné sur le bucket)
export const ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
  'application/pdf',
];

export type ConversationKind = 'COACH' | 'SUPPORT';
export type ConversationStatus = 'OPEN' | 'CLOSED';
export type ConversationScope =
  | 'mine'
  | 'support'
  | 'supervision'
  /** Vue d'ensemble : toutes les conversations, réservée au super-admin. */
  | 'all';

export type ConversationSummary = {
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
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_id: string | null;
  is_system: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, content, attachment_url, attachment_name, attachment_type, attachment_size, reply_to_id, is_system, edited_at, deleted_at, created_at';

export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

// Erreurs métier remontées par les RPC (raise exception '<CODE>').
export type MessagingErrorCode =
  | 'FEATURE_LOCKED' // forfait sans messagerie coach
  | 'NO_COACH' // aucun coach attribué à l'enfant
  | 'FORBIDDEN'
  | 'PARENT_ONLY'
  | 'CHILD_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'UNKNOWN';

const ERROR_LABELS: Record<MessagingErrorCode, string> = {
  FEATURE_LOCKED: "Votre forfait n'inclut pas la messagerie avec le coach.",
  NO_COACH: "Aucun coach n'est encore attribué à cet enfant.",
  FORBIDDEN: "Vous n'avez pas accès à cette conversation.",
  PARENT_ONLY: 'Le guichet support est réservé aux comptes parents.',
  CHILD_NOT_FOUND: 'Profil enfant introuvable.',
  AUTH_REQUIRED: 'Session expirée — reconnectez-vous.',
  UNKNOWN: "L'envoi n'a pas abouti. Réessayez dans un instant.",
};

function toCode(error: { message?: string } | null | undefined): MessagingErrorCode {
  const raw = error?.message ?? '';
  const found = (Object.keys(ERROR_LABELS) as MessagingErrorCode[]).find((c) => raw.includes(c));
  return found ?? 'UNKNOWN';
}

export function messagingErrorLabel(code: MessagingErrorCode): string {
  return ERROR_LABELS[code];
}

// ── Ouverture des fils ───────────────────────────────────────────────────────

export type ConversationHandle = { id: string | null; error?: MessagingErrorCode };

/** Fil avec le coach de l'enfant. `id: null` = aucun coach attribué (pas une erreur). */
export async function openCoachConversation(childId: string): Promise<ConversationHandle> {
  const { data, error } = await supabase.rpc('get_or_create_coach_conversation', {
    p_child_id: childId,
  });
  if (error) return { id: null, error: toCode(error) };
  return { id: (data as string | null) ?? null, error: data ? undefined : 'NO_COACH' };
}

/** Guichet support du parent connecté — toujours disponible, quel que soit le forfait. */
export async function openSupportConversation(): Promise<ConversationHandle> {
  const { data, error } = await supabase.rpc('get_or_create_support_conversation');
  if (error) return { id: null, error: toCode(error) };
  return { id: (data as string | null) ?? null };
}

// ── Listes ───────────────────────────────────────────────────────────────────

export async function listConversations(
  scope: ConversationScope = 'mine'
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('list_my_conversations', { p_scope: scope });
  if (error) return [];
  return (data ?? []) as ConversationSummary[];
}

/** Total des messages non lus qui me sont destinés (badges de navigation). */
export async function countUnreadMessages(): Promise<number> {
  const { data, error } = await supabase.rpc('my_unread_messages');
  if (error) return 0;
  return Number(data ?? 0);
}

// ── Fil de messages ──────────────────────────────────────────────────────────

/** Page de messages, du plus ancien au plus récent. `before` = pagination vers le haut. */
export async function fetchMessages(
  conversationId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<Message[]> {
  const limit = opts.limit ?? 50;
  let query = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.before) query = query.lt('created_at', opts.before);

  const { data } = await query;
  return ((data ?? []) as Message[]).slice().reverse();
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  content: string;
  attachment?: Attachment | null;
  replyToId?: string | null;
}): Promise<{ message?: Message; error?: MessagingErrorCode }> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      content: params.content.slice(0, MESSAGE_MAX_LENGTH),
      attachment_url: params.attachment?.path ?? null,
      attachment_name: params.attachment?.name ?? null,
      attachment_type: params.attachment?.type ?? null,
      attachment_size: params.attachment?.size ?? null,
      reply_to_id: params.replyToId ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) return { error: toCode(error) };
  return { message: data as Message };
}

/** Correction d'un message : autorisée à l'auteur pendant 15 minutes (RLS). */
export async function editMessage(
  messageId: string,
  content: string
): Promise<{ error?: MessagingErrorCode }> {
  const { error } = await supabase
    .from('messages')
    .update({ content: content.slice(0, MESSAGE_MAX_LENGTH) })
    .eq('id', messageId);
  return error ? { error: toCode(error) } : {};
}

/** Suppression douce : le message reste dans le fil, marqué « supprimé ». */
export async function deleteMessage(messageId: string): Promise<{ error?: MessagingErrorCode }> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);
  return error ? { error: toCode(error) } : {};
}

// ── État de lecture ──────────────────────────────────────────────────────────

/**
 * Marque le fil comme lu. `silent` = consultation sans laisser de trace
 * (supervision) : aucun accusé « Lu » n'apparaît chez l'interlocuteur.
 *
 * Le serveur tranche de toute façon : un non-participant n'écrit jamais de
 * marque de lecture, quoi qu'envoie le client (migration 057).
 */
export async function markConversationRead(
  conversationId: string,
  silent = false
): Promise<void> {
  await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
    p_silent: silent,
  });
}

export type ConversationRead = { user_id: string; last_read_at: string };

export async function fetchReads(conversationId: string): Promise<ConversationRead[]> {
  const { data } = await supabase
    .from('conversation_reads')
    .select('user_id, last_read_at')
    .eq('conversation_id', conversationId);
  return (data ?? []) as ConversationRead[];
}

/** Date de lecture la plus récente parmi les AUTRES participants → accusé « Lu ». */
export function othersLastRead(reads: ConversationRead[], myId: string | undefined): number {
  return reads
    .filter((r) => r.user_id !== myId)
    .reduce((max, r) => Math.max(max, new Date(r.last_read_at).getTime()), 0);
}

// ── Pièces jointes ───────────────────────────────────────────────────────────

export function attachmentError(file: File): string | null {
  if (file.size > ATTACHMENT_MAX_BYTES) return 'Fichier trop lourd (10 Mo maximum).';
  if (!ATTACHMENT_MIME_TYPES.includes(file.type)) return 'Format accepté : image ou PDF.';
  return null;
}

/** Nom de fichier sûr pour storage (ASCII, sans espace) — l'original reste en base. */
function safeName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-60) || 'fichier'
  );
}

export async function uploadAttachment(
  conversationId: string,
  file: File
): Promise<{ attachment?: Attachment; error?: string }> {
  const invalid = attachmentError(file);
  if (invalid) return { error: invalid };

  const path = `${conversationId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "Envoi de la pièce jointe impossible." };

  return { attachment: { path, name: file.name, type: file.type, size: file.size } };
}

// URLs signées mises en cache : un fil qui défile ne resigne pas la même image
// à chaque rendu (les URLs valent 1 h, on les garde 55 min).
const signedCache = new Map<string, { url: string; expiresAt: number }>();

export async function attachmentUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const hit = signedCache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const { data } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

export function isImageAttachment(type: string | null): boolean {
  return !!type && type.startsWith('image/');
}

export function humanFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Triage du support (admins) ───────────────────────────────────────────────

export async function setSupportState(
  conversationId: string,
  patch: { status?: ConversationStatus; assign?: boolean }
): Promise<{ error?: MessagingErrorCode }> {
  const { error } = await supabase.rpc('set_support_conversation_state', {
    p_conversation_id: conversationId,
    p_status: patch.status ?? null,
    p_assign: patch.assign ?? null,
  });
  return error ? { error: toCode(error) } : {};
}

// ── Formatage ────────────────────────────────────────────────────────────────

export function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
}

/** Séparateur de journée dans le fil : « Aujourd'hui », « Hier », puis la date. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

/** Horodatage court des listes de conversations (heure du jour, sinon date). */
export function listTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
