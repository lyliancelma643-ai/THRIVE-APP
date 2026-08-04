'use client';

// Une bulle du fil : contenu, pièce jointe, heure, et l'état d'envoi côté
// auteur (en cours / échec avec réparation / remis / lu).

import { useEffect, useState } from 'react';

import { Icon } from '@/components/ui';
import {
  attachmentUrl,
  humanFileSize,
  isImageAttachment,
  messageTime,
  type Message,
} from '@/lib/messaging';
import type { ThreadItem } from '@/hooks/useConversation';
import { BUBBLE_STYLE, TONES, type Tone } from './tone';

function AttachmentView({ message, tone, mine }: { message: Message; tone: Tone; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const t = TONES[tone];

  useEffect(() => {
    let alive = true;
    attachmentUrl(message.attachment_url).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [message.attachment_url]);

  if (!message.attachment_url) return null;
  const label = message.attachment_name ?? 'Pièce jointe';

  if (isImageAttachment(message.attachment_type)) {
    return (
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="block mb-1.5 overflow-hidden rounded-[12px] max-w-[240px]"
        aria-label={`Ouvrir l'image ${label}`}
      >
        {url ? (
          // Pièce jointe issue d'une URL signée (jamais servie par next/image)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="w-full h-auto max-h-64 object-cover" />
        ) : (
          <span className={`block h-32 w-[240px] animate-pulse ${t.skeleton}`} aria-hidden />
        )}
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-1.5 px-3 py-2 rounded-[12px] ${
        mine ? 'bg-black/10' : tone === 'night' ? 'bg-chip' : 'bg-white'
      }`}
    >
      <Icon name="download" className="w-4 h-4 shrink-0" />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold truncate max-w-[190px]">{label}</span>
        {message.attachment_size ? (
          <span className="block text-[10px] opacity-70">
            {humanFileSize(message.attachment_size)}
          </span>
        ) : null}
      </span>
    </a>
  );
}

/** Fenêtre de correction, alignée sur la RLS (messages_update_own : 15 minutes). */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function MessageBubble({
  message,
  mine,
  tone,
  read,
  onRetry,
  onDiscard,
  onEdit,
  onDelete,
}: {
  message: ThreadItem;
  mine: boolean;
  tone: Tone;
  /** L'autre participant a lu ce message (accusé « Lu »). */
  read?: boolean;
  onRetry?: () => void;
  onDiscard?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
}) {
  const t = TONES[tone];
  const failed = message.pending === 'failed';
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const editable =
    mine &&
    !message.pending &&
    !message.deleted_at &&
    Date.now() - new Date(message.created_at).getTime() < EDIT_WINDOW_MS;

  if (message.deleted_at) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <p className={`text-xs italic px-3 py-2 ${t.muted}`}>Message supprimé</p>
      </div>
    );
  }

  // Correction en place : le texte de la bulle devient un champ, Entrée valide,
  // Échap annule — pas de fenêtre modale pour une phrase à retoucher.
  if (editing) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          style={tone === 'night' ? BUBBLE_STYLE.mine : undefined}
          className={`max-w-[85%] md:max-w-[75%] w-full px-[11px] py-2 ${t.bubbleMine}`}
        >
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false);
                setDraft(message.content);
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) onEdit?.(draft);
                setEditing(false);
              }
            }}
            aria-label="Corriger le message"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none"
          />
          <span className="flex justify-end gap-3 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(message.content);
              }}
              className="cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                if (draft.trim()) onEdit?.(draft);
                setEditing(false);
              }}
              className="cursor-pointer underline underline-offset-2"
            >
              Enregistrer
            </button>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-1 max-w-[85%] md:max-w-[75%] ${mine ? 'flex-row' : 'flex-row-reverse'}`}>
        {editable && (onEdit || onDelete) && (
          <span className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Actions sur ce message"
              aria-expanded={menuOpen}
              className={`w-7 h-7 rounded-full grid place-items-center text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(pointer:coarse)]:opacity-55 transition-opacity cursor-pointer ${t.muted} ${
                menuOpen ? 'opacity-100' : ''
              }`}
            >
              •••
            </button>
            {menuOpen && (
              <span
                className={`absolute z-20 bottom-full mb-1 ${mine ? 'left-0' : 'right-0'} flex flex-col rounded-xl overflow-hidden shadow-lg ${
                  tone === 'night' ? 'bg-night-nav' : 'bg-white ring-1 ring-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setDraft(message.content);
                    setEditing(true);
                  }}
                  className={`px-4 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer ${t.title}`}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.();
                  }}
                  className="px-4 py-2 text-xs font-semibold whitespace-nowrap text-red-500 cursor-pointer"
                >
                  Supprimer
                </button>
              </span>
            )}
          </span>
        )}

        <div
          style={tone === 'night' ? (mine ? BUBBLE_STYLE.mine : BUBBLE_STYLE.theirs) : undefined}
          className={`min-w-0 px-[11px] py-2 text-[14.5px] leading-[1.45] whitespace-pre-wrap break-words ${
            mine ? t.bubbleMine : t.bubbleTheirs
          } ${message.pending === 'sending' ? 'opacity-70' : ''} ${
            failed ? 'ring-1 ring-red-400/70' : ''
          }`}
        >
          <AttachmentView message={message} tone={tone} mine={mine} />
          {message.content}
          <span
            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
              mine ? t.metaMine : t.metaTheirs
            }`}
          >
            {message.edited_at && <span>modifié</span>}
            <span>{messageTime(message.created_at)}</span>
            {mine && !message.pending && (
              <span
                aria-label={read ? 'Lu' : 'Envoyé'}
                title={read ? 'Lu' : 'Envoyé'}
                className="grid"
                style={{ color: read ? 'var(--accent-ink)' : 'var(--meta)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m2 12.5 4 4 7.5-8" />
                  {read && <path d="m10 16.5 1.2 1.2L19 9" />}
                </svg>
              </span>
            )}
            {message.pending === 'sending' && <span aria-label="Envoi en cours">…</span>}
          </span>
        </div>
      </div>

      {failed && (
        <span className="flex items-center gap-2 mt-1 text-[11px] text-red-400">
          Non envoyé
          <button
            type="button"
            onClick={onRetry}
            className="font-bold underline underline-offset-2 cursor-pointer"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className={`underline underline-offset-2 cursor-pointer ${t.muted}`}
          >
            Supprimer
          </button>
        </span>
      )}
    </div>
  );
}
