'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Messagerie côté THRIVE — deux métiers, deux onglets :
//
//   • « Support client » : la file des demandes parents. On répond, on prend en
//     charge (le fil n'alerte alors plus que soi), on marque résolu. Un nouveau
//     message d'un parent rouvre automatiquement un ticket clos.
//   • « Supervision » : les échanges coach ↔ parent, en LECTURE SEULE. C'est un
//     choix, pas une limite d'UI : la RLS interdit à un admin d'écrire dans un
//     fil coach (personne ne parle à la place du coach).
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useModalDismiss } from '@/lib/useModalDismiss';
import { useConversationsRealtime } from '@/hooks/useConversation';
import { ConversationList, Thread } from '@/components/messaging';
import { Icon } from '@/components/ui';
import {
  listConversations,
  setSupportState,
  type ConversationSummary,
} from '@/lib/messaging';

type Tab = 'support' | 'supervision';
type Filter = 'todo' | 'all' | 'closed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todo', label: 'À traiter' },
  { key: 'all', label: 'Toutes' },
  { key: 'closed', label: 'Résolues' },
];

function AdminMessagesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<Tab>('support');
  const [filter, setFilter] = useState<Filter>('todo');
  const [support, setSupport] = useState<ConversationSummary[]>([]);
  const [supervision, setSupervision] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('c'));
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, v] = await Promise.all([
      listConversations('support'),
      listConversations('supervision'),
    ]);
    setSupport(s);
    setSupervision(v);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useConversationsRealtime(load);

  // Deep-link d'une notification : on bascule sur l'onglet qui contient le fil.
  useEffect(() => {
    const deep = params.get('c');
    if (!deep || isLoading) return;
    if (supervision.some((c) => c.id === deep)) setTab('supervision');
    else if (support.some((c) => c.id === deep)) setTab('support');
  }, [params, isLoading, support, supervision]);

  useModalDismiss(() => setSelectedId(null), !!selectedId, false);

  const rows = tab === 'support' ? support : supervision;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (tab === 'support') {
      if (filter === 'todo') list = list.filter((c) => c.status === 'OPEN');
      if (filter === 'closed') list = list.filter((c) => c.status === 'CLOSED');
    }
    if (!q) return list;
    return list.filter((c) =>
      `${c.parent_name ?? ''} ${c.coach_name ?? ''} ${c.child_name ?? ''}`.toLowerCase().includes(q)
    );
  }, [rows, tab, filter, search]);

  const selected = [...support, ...supervision].find((c) => c.id === selectedId) ?? null;

  const open = (id: string) => {
    setSelectedId(id);
    if (params.get('c')) router.replace('/admin/messages');
  };

  const chooseTab = (next: Tab) => {
    setTab(next);
    setSelectedId(null);
  };

  const act = async (patch: { status?: 'OPEN' | 'CLOSED'; assign?: boolean }) => {
    if (!selected || busy) return;
    setBusy(true);
    await setSupportState(selected.id, patch);
    await load();
    setBusy(false);
  };

  const isMine = selected?.assigned_admin_id === user?.id;
  const totalTodo = support.filter((c) => c.status === 'OPEN' && c.unread_count > 0).length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight mb-1">Messagerie</h1>
        <p className="text-slate-500 font-medium">
          Le guichet support et la supervision des échanges coach ↔ parent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => chooseTab('support')}
          className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'support'
              ? 'bg-navy-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Support client
          {totalTodo > 0 && (
            <span
              className={`ml-2 inline-flex min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold items-center justify-center ${
                tab === 'support' ? 'bg-white text-navy-700' : 'bg-navy-600 text-white'
              }`}
            >
              {totalTodo}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => chooseTab('supervision')}
          className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'supervision'
              ? 'bg-navy-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Supervision
        </button>

        <span className="flex-1" />

        {tab === 'support' &&
          FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`h-9 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100dvh-16rem)]">
        <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col min-h-0`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un parent, un coach, un athlète…"
            aria-label="Chercher une conversation"
            className="w-full h-11 px-4 mb-3 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-navy-400"
          />
          <div className="flex-1 overflow-y-auto pr-1">
            <ConversationList
              conversations={filtered}
              tone="light"
              selectedId={selectedId}
              onSelect={open}
              isLoading={isLoading}
              emptyLabel={
                tab === 'support'
                  ? 'Aucune demande dans cette vue.'
                  : 'Aucun échange coach ↔ parent pour l’instant.'
              }
            />
          </div>
        </div>

        <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} lg:col-span-2 flex-col min-h-0`}>
          {selected ? (
            <Thread
              key={selected.id}
              conversationId={selected.id}
              myId={user?.id}
              tone="light"
              title={selected.parent_name ?? selected.counterpart_name ?? 'Parent'}
              subtitle={
                selected.kind === 'SUPPORT'
                  ? `Support · ${selected.status === 'CLOSED' ? 'résolu' : 'en cours'}${
                      selected.assigned_admin_id ? (isMine ? ' · pris en charge par vous' : ' · pris en charge') : ''
                    }`
                  : `Coach ${selected.coach_name ?? '—'}${selected.child_name ? ` · ${selected.child_name}` : ''}`
              }
              placeholder="Répondre au parent…"
              readOnly={selected.kind === 'COACH'}
              readOnlyHint="Supervision — lecture seule : personne n’écrit à la place du coach."
              className="flex-1 min-h-[26rem]"
              actions={
                <>
                  {selected.kind === 'SUPPORT' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act({ assign: !isMine })}
                        className="h-9 px-3 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      >
                        {isMine ? 'Relâcher' : 'Prendre en charge'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act({ status: selected.status === 'CLOSED' ? 'OPEN' : 'CLOSED' })}
                        className="h-9 px-3 rounded-full text-xs font-semibold bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50 cursor-pointer"
                      >
                        {selected.status === 'CLOSED' ? 'Rouvrir' : 'Marquer résolu'}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Retour à la liste des conversations"
                    className="lg:hidden w-10 h-10 rounded-full grid place-items-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <Icon name="chevron-right" className="w-5 h-5 rotate-180" />
                  </button>
                </>
              }
              emptyState={
                <p className="text-sm text-slate-400 text-center py-10">
                  {selected.kind === 'SUPPORT'
                    ? 'Le parent n’a pas encore écrit. Vous pouvez ouvrir l’échange.'
                    : 'Aucun message échangé dans ce fil.'}
                </p>
              }
            />
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center rounded-3xl bg-white shadow-sm border border-slate-100">
              <div className="text-center">
                <span className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 grid place-items-center text-slate-400">
                  <Icon name="message" className="w-7 h-7" />
                </span>
                <p className="text-base font-bold text-slate-900 mb-1">Aucune conversation ouverte</p>
                <p className="text-sm text-slate-500">
                  Choisissez une conversation dans la liste pour l’afficher ici.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    // Suspense requis par useSearchParams (deep-link ?c= des notifications)
    <Suspense fallback={<div className="max-w-7xl mx-auto h-64 rounded-3xl bg-white animate-pulse" />}>
      <AdminMessagesInner />
    </Suspense>
  );
}
