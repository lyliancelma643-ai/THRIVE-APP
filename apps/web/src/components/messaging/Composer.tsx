'use client';

// Zone de rédaction : champ qui grandit avec le texte, Entrée pour envoyer
// (Maj+Entrée = nouvelle ligne, et sur mobile la touche ne fait jamais partir
// le message par surprise), pièce jointe avec aperçu, compteur discret quand on
// approche de la limite.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Icon } from '@/components/ui';
import {
  ATTACHMENT_MIME_TYPES,
  MESSAGE_MAX_LENGTH,
  attachmentError,
  humanFileSize,
  uploadAttachment,
  type Attachment,
} from '@/lib/messaging';
import { TONES, type Tone } from './tone';

export function Composer({
  conversationId,
  tone,
  placeholder = 'Écrire un message…',
  disabled = false,
  disabledHint,
  allowAttachments = true,
  draftSeed,
  onSend,
  onTyping,
}: {
  conversationId: string;
  tone: Tone;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  allowAttachments?: boolean;
  /** Amorce de message (suggestions du support) — remplace le brouillon en cours. */
  draftSeed?: string | null;
  onSend: (content: string, attachment: Attachment | null) => Promise<boolean>;
  onTyping?: () => void;
}) {
  const t = TONES[tone];
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Une suggestion cliquée pré-remplit le champ et donne le focus : l'usager
  // complète en une phrase au lieu de partir de la page blanche.
  useEffect(() => {
    if (!draftSeed) return;
    setDraft(draftSeed);
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(draftSeed.length, draftSeed.length);
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draftSeed]);

  const grow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const content = draft.trim();
    if (sending || uploading || disabled || (!content && !attachment)) return;
    setSending(true);
    const ok = await onSend(content, attachment);
    setSending(false);
    if (!ok) return; // la bulle « Non envoyé » prend le relais, on garde le brouillon
    setDraft('');
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
    requestAnimationFrame(grow);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Entrée envoie sur desktop uniquement : sur mobile la touche « Entrée »
    // du clavier virtuel sert à aller à la ligne.
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (e.key === 'Enter' && !e.shiftKey && isDesktop) {
      e.preventDefault();
      submit();
    }
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const invalid = attachmentError(file);
    if (invalid) {
      setFileError(invalid);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const { attachment: uploaded, error } = await uploadAttachment(conversationId, file);
    setUploading(false);
    if (error || !uploaded) {
      setFileError(error ?? "Envoi impossible.");
      e.target.value = '';
      return;
    }
    setAttachment(uploaded);
  };

  const remaining = MESSAGE_MAX_LENGTH - draft.length;
  const canSend = !disabled && !sending && !uploading && (!!draft.trim() || !!attachment);

  if (disabled) {
    return (
      <div className={`px-4 py-4 border-t ${t.divider}`}>
        <p className={`text-sm text-center ${t.muted}`}>{disabledHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`border-t ${t.divider}`}>
      {(attachment || fileError) && (
        <div className="px-4 pt-3">
          {attachment && (
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${t.bubbleTheirs}`}
            >
              <Icon name="check" className="w-3.5 h-3.5" />
              <span className="max-w-[180px] truncate">{attachment.name}</span>
              <span className="opacity-60">{humanFileSize(attachment.size)}</span>
              <button
                type="button"
                onClick={() => {
                  setAttachment(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                aria-label="Retirer la pièce jointe"
                className="font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
          {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
        </div>
      )}

      <div className="flex items-end gap-2 p-3 md:p-4">
        {allowAttachments && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={ATTACHMENT_MIME_TYPES.join(',')}
              onChange={pickFile}
              className="hidden"
              id={`attach-${conversationId}`}
            />
            <label
              htmlFor={`attach-${conversationId}`}
              aria-label="Joindre une image ou un PDF"
              className={`shrink-0 w-11 h-11 rounded-full grid place-items-center cursor-pointer transition-colors ${t.iconButton} ${
                uploading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Icon name="plus" className="w-5 h-5" />
            </label>
          </>
        )}

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => {
              setDraft(e.target.value);
              grow();
              onTyping?.();
            }}
            onKeyDown={onKeyDown}
            placeholder={uploading ? 'Envoi de la pièce jointe…' : placeholder}
            aria-label="Écrire un message"
            className={`w-full resize-none px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed focus:outline-none ${t.input}`}
          />
          {remaining < 200 && (
            <p className={`text-[10px] mt-1 pl-2 ${t.muted}`}>{remaining} caractères restants</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Envoyer"
          className={`shrink-0 w-11 h-11 rounded-full grid place-items-center font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${t.sendButton}`}
        >
          <Icon name="arrow-right" className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
