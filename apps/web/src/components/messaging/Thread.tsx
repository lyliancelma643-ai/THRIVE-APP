'use client';

// Fil complet, prêt à poser : en-tête + messages + zone de rédaction.
// Les trois espaces s'en servent tels quels ; seul le `tone` change, plus
// éventuellement une barre d'actions (triage du support).

import { useConversation } from '@/hooks/useConversation';
import { messagingErrorLabel } from '@/lib/messaging';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { TONES, type Tone } from './tone';

export function Thread({
  conversationId,
  myId,
  tone,
  title,
  subtitle,
  actions,
  emptyState,
  placeholder,
  readOnly = false,
  readOnlyHint,
  allowAttachments = true,
  draftSeed,
  className = '',
  bodyClassName = '',
}: {
  conversationId: string;
  myId: string | undefined;
  tone: Tone;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  emptyState?: React.ReactNode;
  placeholder?: string;
  /** Supervision admin, ticket clos, forfait insuffisant : lecture seule. */
  readOnly?: boolean;
  readOnlyHint?: string;
  allowAttachments?: boolean;
  draftSeed?: string | null;
  className?: string;
  bodyClassName?: string;
}) {
  const t = TONES[tone];
  const thread = useConversation(conversationId, myId);

  return (
    <div className={`flex flex-col min-h-0 ${t.panel} ${className}`}>
      {(title || actions) && (
        <div className={`flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b ${t.divider}`}>
          <div className="min-w-0">
            {title && <p className={`text-sm font-semibold truncate ${t.title}`}>{title}</p>}
            {subtitle && <p className={`text-xs truncate ${t.subtitle}`}>{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      <MessageList
        messages={thread.messages}
        myId={myId}
        tone={tone}
        isLoading={thread.isLoading}
        hasMore={thread.hasMore}
        onLoadMore={thread.loadMore}
        othersReadAt={thread.othersReadAt}
        typing={thread.typing}
        emptyState={emptyState}
        onRetry={thread.retry}
        onDiscard={thread.discard}
        onEdit={readOnly ? undefined : thread.edit}
        onDelete={readOnly ? undefined : thread.remove}
        className={bodyClassName}
      />

      {thread.error && (
        <div className="px-4 pb-1">
          <p className="text-xs text-red-400 flex items-center justify-between gap-2">
            {messagingErrorLabel(thread.error)}
            <button
              type="button"
              onClick={thread.clearError}
              aria-label="Masquer l'erreur"
              className="font-bold cursor-pointer"
            >
              ×
            </button>
          </p>
        </div>
      )}

      <Composer
        conversationId={conversationId}
        tone={tone}
        placeholder={placeholder}
        disabled={readOnly}
        disabledHint={readOnlyHint}
        allowAttachments={allowAttachments}
        draftSeed={draftSeed}
        onSend={thread.send}
        onTyping={thread.notifyTyping}
      />
    </div>
  );
}
