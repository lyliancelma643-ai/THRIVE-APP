'use client';

// Liste de fils (inbox coach, file du support, supervision admin) : dernier
// message, horodatage, pastille de non-lus, et état du ticket côté support.

import { initials, listTime, type ConversationSummary } from '@/lib/messaging';
import { TONES, type Tone } from './tone';

export function ConversationRow({
  conversation,
  tone,
  active,
  onSelect,
  /** Sous-titre libre — par défaut l'athlète concerné. */
  subtitle,
}: {
  conversation: ConversationSummary;
  tone: Tone;
  active: boolean;
  onSelect: () => void;
  subtitle?: string;
}) {
  const t = TONES[tone];
  const c = conversation;
  const name = c.counterpart_name ?? (c.kind === 'SUPPORT' ? 'Support THRIVE' : 'Conversation');
  const sub =
    subtitle ??
    (c.child_name
      ? `À propos de ${c.child_name}`
      : c.kind === 'SUPPORT'
        ? 'Assistance THRIVE'
        : 'Famille THRIVE');

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={`w-full text-left flex items-center gap-3 p-3.5 rounded-[18px] transition-colors cursor-pointer ${
        active ? t.rowActive : t.rowIdle
      }`}
    >
      <span
        className={`w-11 h-11 shrink-0 rounded-full grid place-items-center text-sm font-bold ${t.avatar}`}
        aria-hidden
      >
        {initials(name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate ${t.title}`}>{name}</span>
          <span className={`text-[10px] shrink-0 ${t.muted}`}>{listTime(c.last_message_at)}</span>
        </span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-xs truncate ${t.subtitle}`}>
            {c.last_message_preview || sub}
          </span>
          {c.unread_count > 0 && (
            <span
              className={`shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold grid place-items-center ${t.badge}`}
            >
              {c.unread_count > 9 ? '9+' : c.unread_count}
            </span>
          )}
        </span>
        {(c.status === 'CLOSED' || (c.kind === 'SUPPORT' && c.assigned_admin_id)) && (
          <span className={`inline-flex items-center gap-1 mt-1 text-[10px] ${t.muted}`}>
            {c.status === 'CLOSED' ? '● Résolu' : '● Pris en charge'}
          </span>
        )}
      </span>
    </button>
  );
}

export function ConversationList({
  conversations,
  tone,
  selectedId,
  onSelect,
  isLoading,
  emptyLabel = 'Aucune conversation pour le moment.',
  className = '',
}: {
  conversations: ConversationSummary[];
  tone: Tone;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const t = TONES[tone];

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-[68px] rounded-[18px] animate-pulse ${t.skeleton}`} />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return <p className={`text-sm p-6 text-center ${t.muted} ${className}`}>{emptyLabel}</p>;
  }

  return (
    <div className={`space-y-2 ${className}`} role="list">
      {conversations.map((c) => (
        <div key={c.id} role="listitem">
          <ConversationRow
            conversation={c}
            tone={tone}
            active={c.id === selectedId}
            onSelect={() => onSelect(c.id)}
          />
        </div>
      ))}
    </div>
  );
}
