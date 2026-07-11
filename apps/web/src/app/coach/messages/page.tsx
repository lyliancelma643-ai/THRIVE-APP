'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

// ─────────────────────────────────────────────────────────────────────────────
// Inbox coach — pendant minimal de la messagerie parent (forfait Performance).
// Le coach voit ses conversations et répond ; les parents dont le forfait
// n'ouvre pas la messagerie n'apparaissent simplement pas (aucune conversation).
// ─────────────────────────────────────────────────────────────────────────────

type Conversation = {
  id: string;
  parent_id: string;
  child_id: string | null;
  last_message_at: string | null;
  parent: { first_name: string; last_name: string } | null;
  child: { first_name: string } | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function CoachMessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('conversations')
      .select(
        'id, parent_id, child_id, last_message_at, parent:parent_id (first_name, last_name), child:child_id (first_name)'
      )
      .eq('coach_id', user.id)
      .order('last_message_at', { ascending: false });
    const rows = ((data ?? []) as any[]).map((c) => ({
      ...c,
      parent: Array.isArray(c.parent) ? c.parent[0] ?? null : c.parent,
      child: Array.isArray(c.child) ? c.child[0] ?? null : c.child,
    })) as Conversation[];
    setConversations(rows);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as Msg[]);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    const channel = supabase
      .channel(`coach-messages-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || !user?.id || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: selectedId, sender_id: user.id, content })
      .select('id, conversation_id, sender_id, content, created_at')
      .single();
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
      setDraft('');
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedId);
    }
    setSending(false);
  };

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-navy-900 mb-1">Messages</h1>
      <p className="text-sm text-navy-600/60 mb-6">
        Les échanges directs avec les parents (forfait Performance).
      </p>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white shadow-card animate-pulse" aria-hidden />
      ) : conversations.length === 0 ? (
        <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
          Aucune conversation pour l&apos;instant. Les parents au forfait Performance peuvent vous
          écrire depuis leur espace.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste des conversations */}
          <div className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-shadow ${
                  c.id === selectedId ? 'ring-2 ring-navy-400' : ''
                }`}
              >
                <span className="w-9 h-9 rounded-full bg-navy-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {c.parent?.first_name?.[0] ?? '?'}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy-900 truncate">
                    {c.parent ? `${c.parent.first_name} ${c.parent.last_name}` : 'Parent'}
                  </span>
                  <span className="block text-xs text-navy-600/60 truncate">
                    {c.child ? `Parent de ${c.child.first_name}` : 'Famille THRIVE'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Fil de la conversation sélectionnée */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="rounded-2xl bg-white shadow-card flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-semibold text-navy-900">
                    {selected.parent
                      ? `${selected.parent.first_name} ${selected.parent.last_name}`
                      : 'Parent'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[14rem] max-h-[50vh]" aria-live="polite">
                  {messages.length === 0 && (
                    <p className="text-sm text-navy-600/50 text-center py-8">
                      Aucun message dans cette conversation.
                    </p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                            mine
                              ? 'bg-navy-600 text-white rounded-2xl rounded-br-md'
                              : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md'
                          }`}
                        >
                          {m.content}
                          <span
                            className={`block text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}
                          >
                            {new Date(m.created_at).toLocaleString('fr-CA', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={send} className="flex items-center gap-2 p-4 border-t border-slate-100">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Répondre…"
                    aria-label="Répondre"
                    className="flex-1 min-w-0 h-11 px-4 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="shrink-0 px-5 h-11 rounded-full bg-navy-600 text-white text-sm font-bold hover:bg-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
                Sélectionnez une conversation pour lire et répondre.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
