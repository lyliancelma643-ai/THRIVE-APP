'use client';

// Le fil : séparateurs de journée, défilement intelligent (on ne saute au bas
// que si l'utilisateur y était déjà — sinon on ne lui vole pas sa lecture),
// chargement de l'historique vers le haut, et indicateur de frappe.

import { useEffect, useRef } from 'react';
import { dayLabel } from '@/lib/messaging';
import type { ThreadItem } from '@/hooks/useConversation';
import { MessageBubble } from './MessageBubble';
import { TONES, type Tone } from './tone';

export function MessageList({
  messages,
  myId,
  tone,
  isLoading,
  hasMore,
  onLoadMore,
  othersReadAt,
  typing,
  typingLabel,
  emptyState,
  onRetry,
  onDiscard,
  onEdit,
  onDelete,
  className = '',
}: {
  messages: ThreadItem[];
  myId: string | undefined;
  tone: Tone;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  othersReadAt: number;
  typing?: boolean;
  typingLabel?: string;
  emptyState?: React.ReactNode;
  onRetry?: (id: string) => void;
  onDiscard?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}) {
  const t = TONES[tone];
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const lastCount = useRef(0);

  // Avant chaque rendu de nouveaux messages : est-on collé au bas du fil ?
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const grew = messages.length > lastCount.current;
    const first = lastCount.current === 0;
    lastCount.current = messages.length;
    if (!grew) return;
    if (first || wasAtBottom.current) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: first ? 'auto' : 'smooth' });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className={`flex-1 p-5 space-y-3 ${className}`} aria-hidden>
        {[70, 45, 60].map((w, i) => (
          <div
            key={i}
            className={`h-10 rounded-[18px] animate-pulse ${t.skeleton} ${
              i % 2 ? 'ml-auto' : ''
            }`}
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4 space-y-2 ${className}`}
      aria-live="polite"
      aria-relevant="additions"
    >
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onLoadMore}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer ${t.iconButton}`}
          >
            Voir les messages précédents
          </button>
        </div>
      )}

      {messages.length === 0 && emptyState}

      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay =
          !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
        const mine = m.sender_id === myId;
        return (
          <div key={m.id} className="space-y-2">
            {newDay && (
              <p
                className={`text-center text-[11px] font-semibold uppercase tracking-wide py-2 ${t.daySeparator}`}
              >
                {dayLabel(m.created_at)}
              </p>
            )}
            <MessageBubble
              message={m}
              mine={mine}
              tone={tone}
              read={mine && new Date(m.created_at).getTime() <= othersReadAt}
              onRetry={() => onRetry?.(m.id)}
              onDiscard={() => onDiscard?.(m.id)}
              onEdit={onEdit ? (content) => onEdit(m.id, content) : undefined}
              onDelete={onDelete ? () => onDelete(m.id) : undefined}
            />
          </div>
        );
      })}

      {typing && (
        <p className={`flex items-center gap-1.5 text-xs pl-1 ${t.muted}`}>
          <span className="flex gap-0.5" aria-hidden>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
          </span>
          {typingLabel ?? 'écrit…'}
        </p>
      )}

      <div ref={endRef} />
    </div>
  );
}
