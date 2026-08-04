'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Messagerie parent — design « Tour 3 ».
//
// L'enveloppe du header ouvre un panneau plein écran façon messagerie mobile :
//   • une liste de DEUX fils seulement — le coach dédié de l'enfant et le
//     support THRIVE — avec aperçu, heure et badge de non-lus ;
//   • le fil lui-même : séparateurs de date, bulles entrantes/sortantes, double
//     coche en accent quand c'est lu, indicateur de saisie, champ d'écriture ;
//   • retour par le chevron OU en glissant vers la droite.
//
// Droits : le fil coach est l'exclusivité du forfait Performance (feature
// coachMessaging) ; le SUPPORT est ouvert à tous, y compris compte en cours
// d'activation — c'est justement là qu'on a besoin de nous écrire. L'UI ne fait
// que refléter ces droits, l'enforcement est en RLS (migrations 041 + 056).
//
// Le panneau est monté en PORTAIL sur document.body : la coque parent porte un
// transform permanent (animations d'onglet), qui piégerait un position:fixed.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { usePlan } from '@/lib/entitlements';
import { featureUpgradeHint } from '@/lib/packs';
import { UpgradeHintBar } from '@/components/parent/PackGate';
import { MessageList } from '@/components/messaging/MessageList';
import { Composer } from '@/components/messaging/Composer';
import { useConversation } from '@/hooks/useConversation';
import { useModalDismiss } from '@/lib/useModalDismiss';
import {
  initials,
  listConversations,
  listTime,
  openCoachConversation,
  openSupportConversation,
  type ConversationSummary,
  type MessagingErrorCode,
} from '@/lib/messaging';

type Row = {
  key: 'coach' | 'support';
  id: string | null;
  name: string;
  /** Libellé du champ de saisie — « Écrire à Marc », « Écrire au support ». */
  writeTo: string;
  subtitle: string;
  tint: string;
  error: MessagingErrorCode | null;
  summary: ConversationSummary | null;
};

const CHEVRON = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.1}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m15 6-6 6 6 6" />
  </svg>
);

function MessagesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const deepLink = params.get('c');

  const { user } = useAuthStore();
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const { can, pack } = usePlan(selectedChildId);
  const canCoachMessaging = can('coachMessaging');

  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<MessagingErrorCode | null>(null);
  const [supportId, setSupportId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadSummaries = useCallback(async () => {
    setSummaries(await listConversations('mine'));
  }, []);

  // Ouverture (ou récupération) des deux fils. Le support ne dépend d'aucun
  // droit ; le fil coach n'est ouvert que si le forfait l'autorise.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const support = await openSupportConversation();
      if (cancelled) return;
      setSupportId(support.id);

      if (selectedChildId && canCoachMessaging) {
        const coach = await openCoachConversation(selectedChildId);
        if (cancelled) return;
        setCoachId(coach.id);
        setCoachError(coach.id ? null : (coach.error ?? 'NO_COACH'));
      } else {
        setCoachId(null);
        setCoachError(canCoachMessaging ? null : 'FEATURE_LOCKED');
      }
      if (!cancelled) {
        setLoading(false);
        loadSummaries();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChildId, canCoachMessaging, loadSummaries]);

  // Un lien de notification (?c=…) ouvre directement le bon fil.
  useEffect(() => {
    if (!deepLink || loading) return;
    if (deepLink === supportId || deepLink === coachId) setOpenId(deepLink);
  }, [deepLink, loading, supportId, coachId]);

  const summaryOf = (id: string | null) => summaries.find((s) => s.id === id) ?? null;
  const coachSummary = summaryOf(coachId);

  const rows: Row[] = [
    {
      key: 'coach',
      id: coachId,
      name: coachSummary?.coach_name ?? coachSummary?.counterpart_name ?? 'Votre coach THRIVE',
      writeTo: (coachSummary?.coach_name ?? '').split(' ')[0] || 'votre coach',
      subtitle: selectedChild ? `Coach de ${selectedChild.first_name}` : 'Coach THRIVE',
      tint: 'var(--brand)',
      error: coachError,
      summary: coachSummary,
    },
    {
      key: 'support',
      id: supportId,
      name: 'Support THRIVE',
      writeTo: 'au support THRIVE',
      subtitle: 'Assistance · réponse sous un jour ouvrable',
      tint: 'var(--sage)',
      error: null,
      summary: summaryOf(supportId),
    },
  ];

  const openRow = rows.find((r) => r.id && r.id === openId) ?? null;

  const closeThread = useCallback(() => {
    setOpenId(null);
    if (deepLink) router.replace('/parent/messages');
    loadSummaries();
  }, [deepLink, router, loadSummaries]);

  const leave = useCallback(() => router.push('/parent/bilans'), [router]);

  // Échap : referme le fil, puis la messagerie — jamais de cul-de-sac.
  useModalDismiss(() => (openId ? closeThread() : leave()), true, true);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col animate-msg-in"
      style={{ background: 'var(--chat-bg)' }}
      role="dialog"
      aria-label="Messagerie THRIVE"
    >
      {openRow ? (
        <ThreadView
          row={openRow}
          myId={user?.id}
          onBack={closeThread}
          unreadElsewhere={rows.some((r) => r.id !== openRow.id && (r.summary?.unread_count ?? 0) > 0)}
        />
      ) : (
        <ListView
          rows={rows}
          loading={loading}
          pack={pack}
          childName={selectedChild?.first_name ?? null}
          onOpen={setOpenId}
          onLeave={leave}
        />
      )}
    </div>,
    document.body
  );
}

// ── Liste des fils ───────────────────────────────────────────────────────────
function ListView({
  rows,
  loading,
  pack,
  childName,
  onOpen,
  onLeave,
}: {
  rows: Row[];
  loading: boolean;
  pack: ReturnType<typeof usePlan>['pack'];
  childName: string | null;
  onOpen: (id: string) => void;
  onLeave: () => void;
}) {
  const totalUnread = rows.reduce((n, r) => n + (r.summary?.unread_count ?? 0), 0);
  const locked = rows.find((r) => r.key === 'coach')?.error === 'FEATURE_LOCKED';

  return (
    <>
      <header
        className="shrink-0 flex items-center gap-2 px-2.5 pb-2.5 border-b border-line safe-top"
        style={{ background: 'var(--chat-bar)', boxShadow: 'var(--tab-shadow)', paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onLeave}
          aria-label="Fermer la messagerie"
          className="shrink-0 w-10 h-10 rounded-full grid place-items-center text-body hover:bg-surface-sub cursor-pointer"
        >
          {CHEVRON}
        </button>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="font-display text-[22px] font-semibold text-ink">Messages</span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-soft">
            {totalUnread > 0 && (
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />
            )}
            <span>
              {totalUnread > 0
                ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}`
                : 'Tout est lu'}
              {childName ? ` · dossier de ${childName}` : ''}
            </span>
          </span>
        </span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto py-3.5">
        {loading ? (
          <div className="px-3.5 space-y-3" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="h-[68px] rounded-[18px] bg-surface-sub animate-pulse" />
            ))}
          </div>
        ) : (
          rows.map((row, i) => (
            <div key={row.key}>
              <ConversationRowItem row={row} onOpen={onOpen} />
              {i < rows.length - 1 && <div className="h-px bg-line ml-[78px]" />}
            </div>
          ))
        )}

        {locked && (
          <div className="mx-4 mt-4">
            <UpgradeHintBar pack={pack} hint={featureUpgradeHint('coachMessaging')} />
          </div>
        )}

        <p className="mt-5 mx-6 text-[12.5px] leading-[1.5] text-faint text-center text-pretty">
          Deux interlocuteurs seulement : le coach dédié de votre enfant et le support THRIVE. Les
          échanges sont conservés dans son dossier et ne sont jamais partagés avec le club.
        </p>
      </div>
    </>
  );
}

function ConversationRowItem({ row, onOpen }: { row: Row; onOpen: (id: string) => void }) {
  const unread = row.summary?.unread_count ?? 0;
  const preview =
    row.summary?.last_message_preview ||
    (row.error === 'FEATURE_LOCKED'
      ? 'Inclus au forfait Performance'
      : row.error === 'NO_COACH'
        ? 'Coach bientôt attribué'
        : row.key === 'support'
          ? 'Une question ? Écrivez-nous ici.'
          : 'Démarrez la conversation');
  const disabled = !row.id;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => row.id && onOpen(row.id)}
      className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 transition-colors ${
        disabled ? 'opacity-55 cursor-not-allowed' : 'hover:bg-surface-sub cursor-pointer'
      }`}
    >
      <span
        className="shrink-0 w-[52px] h-[52px] rounded-full grid place-items-center text-[15px] font-bold text-white"
        style={{ background: row.tint }}
        aria-hidden
      >
        {initials(row.name)}
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 min-w-0 text-[15.5px] font-semibold text-ink truncate">
            {row.name}
          </span>
          <span
            className="shrink-0 text-[11.5px] font-semibold"
            style={{ color: unread > 0 ? 'var(--accent-ink)' : 'var(--text4)' }}
          >
            {/* Un fil sans message n'affiche pas d'heure : sa date de création
                n'a aucun sens pour l'usager. */}
            {row.summary?.last_message_preview ? listTime(row.summary.last_message_at) : ''}
          </span>
        </span>
        <span className="flex items-center gap-[7px]">
          <span className="flex-1 min-w-0 text-[13.5px] text-soft truncate">{preview}</span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[21px] h-[21px] px-1.5 rounded-full bg-accent text-accent-on text-[11.5px] font-bold grid place-items-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// ── Fil ouvert ───────────────────────────────────────────────────────────────
function ThreadView({
  row,
  myId,
  onBack,
  unreadElsewhere,
}: {
  row: Row;
  myId: string | undefined;
  onBack: () => void;
  unreadElsewhere: boolean;
}) {
  const thread = useConversation(row.id, myId);
  // Retour au geste : un glissement vers la droite referme le fil, comme une
  // pile de navigation iOS. Le défilement vertical reste prioritaire.
  const [dragX, setDragX] = useState(0);
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
  const [axis, setAxis] = useState<'none' | 'x' | 'y'>('none');

  const firstName = row.name.split(' ')[0];

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: axis === 'x' ? 'none' : 'transform .3s cubic-bezier(.22,.61,.36,1)',
        touchAction: 'pan-y',
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        setFrom({ x: e.clientX, y: e.clientY });
        setAxis('none');
      }}
      onPointerMove={(e) => {
        if (!from) return;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;
        if (axis === 'none') {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
          if (Math.abs(dy) >= Math.abs(dx)) {
            setFrom(null);
            return;
          }
          setAxis('x');
        }
        setDragX(Math.max(0, dx)); // seul le retour (vers la droite) est suivi
      }}
      onPointerUp={() => {
        const shouldClose = axis === 'x' && dragX > 56;
        setFrom(null);
        setAxis('none');
        setDragX(0);
        if (shouldClose) onBack();
      }}
      onPointerCancel={() => {
        setFrom(null);
        setAxis('none');
        setDragX(0);
      }}
    >
      <header
        className="shrink-0 flex items-center gap-2 px-2.5 pb-2.5 border-b border-line"
        style={{ background: 'var(--chat-bar)', boxShadow: 'var(--tab-shadow)', paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à la liste des conversations"
          className="relative shrink-0 w-10 h-10 rounded-full grid place-items-center text-body hover:bg-surface-sub cursor-pointer"
        >
          {CHEVRON}
          {unreadElsewhere && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" aria-hidden />
          )}
        </button>
        <span
          className="shrink-0 w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold text-white"
          style={{ background: row.tint }}
          aria-hidden
        >
          {initials(row.name)}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-px">
          <span className="text-[15.5px] font-semibold text-ink truncate">{row.name}</span>
          <span className="text-[12px] text-soft truncate">
            {thread.typing ? 'écrit…' : row.subtitle}
          </span>
        </span>
      </header>

      <MessageList
        messages={thread.messages}
        myId={myId}
        tone="night"
        isLoading={thread.isLoading}
        hasMore={thread.hasMore}
        onLoadMore={thread.loadMore}
        othersReadAt={thread.othersReadAt}
        typing={thread.typing}
        typingLabel={`${firstName} écrit…`}
        onRetry={thread.retry}
        onDiscard={thread.discard}
        onEdit={thread.edit}
        onDelete={thread.remove}
        className="px-0"
        emptyState={
          <p className="mx-6 my-10 text-[12.5px] leading-[1.5] text-faint text-center text-pretty">
            {row.key === 'support'
              ? 'Facturation, accès, forfait, souci technique : écrivez-nous ici, notre équipe vous répond dans cette même conversation.'
              : `Racontez ce que vous observez — ${firstName} vous répond ici, entre les séances.`}
          </p>
        }
      />

      <div style={{ background: 'var(--chat-bar)' }} className="shrink-0">
        <Composer
          conversationId={row.id!}
          tone="night"
          placeholder={`Écrire ${row.writeTo.startsWith('au') ? '' : 'à '}${row.writeTo}`}
          onSend={thread.send}
          onTyping={thread.notifyTyping}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    // Suspense requis par useSearchParams (deep-link ?c= des notifications)
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}
