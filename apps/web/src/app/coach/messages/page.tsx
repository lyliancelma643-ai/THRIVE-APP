'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Boîte de réception du coach : un fil par famille suivie (forfait Performance).
// Liste à gauche, conversation à droite ; sur mobile, la liste laisse la place
// au fil dès qu'on en ouvre un (retour ← ou Échap pour revenir).
//
// Les fils apparaissent dès qu'un parent écrit : c'est lui qui ouvre le
// guichet. Le coach peut aussi démarrer la conversation depuis la fiche d'un
// athlète (bouton « Écrire au parent »).
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useModalDismiss } from '@/lib/useModalDismiss';
import { useConversationsRealtime } from '@/hooks/useConversation';
import { ConversationList, Thread } from '@/components/messaging';
import { Icon } from '@/components/ui';
import { listConversations, type ConversationSummary } from '@/lib/messaging';

function CoachMessagesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('c'));
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await listConversations('mine');
    setConversations(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useConversationsRealtime(load);

  // Échap referme le fil ouvert (sur mobile il occupe tout l'écran).
  useModalDismiss(() => setSelectedId(null), !!selectedId, false);

  const open = (id: string) => {
    setSelectedId(id);
    if (params.get('c')) router.replace('/coach/messages');
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.counterpart_name ?? ''} ${c.child_name ?? ''}`.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const totalUnread = conversations.reduce((n, c) => n + c.unread_count, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-navy-900 mb-1">
        Messages
        {totalUnread > 0 && (
          <span className="ml-2 align-middle inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-navy-600 text-white text-xs font-bold items-center justify-center">
            {totalUnread}
          </span>
        )}
      </h1>
      <p className="text-sm text-navy-600/60 mb-6">
        Vos échanges directs avec les parents, entre les séances.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100dvh-14rem)]">
        {/* Liste — plein écran sur mobile tant qu'aucun fil n'est ouvert */}
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col min-h-0`}>
          <div className="relative mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un parent, un athlète…"
              aria-label="Chercher une conversation"
              className="w-full h-11 pl-4 pr-4 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-navy-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <ConversationList
              conversations={filtered}
              tone="light"
              selectedId={selectedId}
              onSelect={open}
              isLoading={isLoading}
              emptyLabel={
                search
                  ? 'Aucune conversation ne correspond à cette recherche.'
                  : 'Aucune conversation pour l’instant. Les parents au forfait Performance peuvent vous écrire depuis leur espace.'
              }
            />
          </div>
        </div>

        {/* Fil */}
        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} lg:col-span-2 flex-col min-h-0`}>
          {selected ? (
            <Thread
              conversationId={selected.id}
              myId={user?.id}
              tone="light"
              title={selected.counterpart_name ?? 'Parent'}
              subtitle={selected.child_name ? `Parent de ${selected.child_name}` : 'Famille THRIVE'}
              placeholder="Répondre…"
              className="flex-1 min-h-[26rem]"
              actions={
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Retour à la liste des conversations"
                  className="lg:hidden w-10 h-10 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <Icon name="chevron-right" className="w-5 h-5 rotate-180" />
                </button>
              }
              emptyState={
                <p className="text-sm text-slate-400 text-center py-10">
                  Aucun message dans cette conversation.
                </p>
              }
            />
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center rounded-3xl bg-white shadow-card">
              <p className="text-sm text-navy-600/60">
                Sélectionnez une conversation pour lire et répondre.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoachMessagesPage() {
  return (
    // Suspense requis par useSearchParams (deep-link ?c= des notifications)
    <Suspense fallback={<div className="p-8 max-w-6xl mx-auto h-64 animate-pulse bg-white rounded-3xl" />}>
      <CoachMessagesInner />
    </Suspense>
  );
}
