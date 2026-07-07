'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabaseClient as supabase } from '@thrive/shared';
import { ChatMessage, AdminProfile, CHAT_CHANNELS, fullName, fmtDateTime } from '@/lib/roadmap';

// ─────────────────────────────────────────────────────────────────────────────
// Chat d'équipe — un canal par groupe de projet (+ # général) pour les
// échanges rapides. Temps réel + mentions (notification pour la personne).
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  me: string;
  admins: AdminProfile[];
  dark: boolean;
  onClose: () => void;
};

export function ChatPanel({ me, admins, dark, onClose }: Props) {
  const [channel, setChannel] = useState('GENERAL');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const adminById = Object.fromEntries(admins.map((a) => [a.id, a]));

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('admin_chat_messages')
      .select('*')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(100);
    setMessages(((data ?? []) as ChatMessage[]).reverse());
  }, [channel]);

  useEffect(() => {
    load();
    const sub = supabase
      .channel(`admin-chat-${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chat_messages' }, load)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!body.trim()) return;
    await supabase.from('admin_chat_messages').insert({
      channel, author: me, body: body.trim(), mentions,
    });
    setBody('');
    setMentions([]);
    await load();
  };

  const toggleMention = (id: string, name: string) => {
    if (mentions.includes(id)) {
      setMentions(mentions.filter((m) => m !== id));
      setBody(body.replace(`@${name} `, '').replace(`@${name}`, ''));
    } else {
      setMentions([...mentions, id]);
      setBody((b) => (b.endsWith(' ') || b === '' ? b : b + ' ') + `@${name} `);
    }
  };

  return createPortal(
    <div className={dark ? 'dark' : ''}>
      <div className="fixed inset-0 z-[80] bg-navy-900/40" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 bottom-0 z-[85] w-full max-w-md flex flex-col bg-white dark:bg-[#0d1b2a] border-l border-slate-100 dark:border-white/10 shadow-2xl"
        role="dialog"
        aria-label="Chat d'équipe"
      >
        {/* En-tête + canaux */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-navy-900 dark:text-white">Chat d&apos;équipe</h2>
            <button
              onClick={onClose}
              aria-label="Fermer le chat"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CHAT_CHANNELS.map((c) => (
              <button
                key={c.key}
                onClick={() => setChannel(c.key)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  channel === c.key
                    ? 'bg-navy-600 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m) => {
            const mine = m.author === me;
            return (
              <div key={m.id} className={`max-w-[85%] ${mine ? 'ml-auto' : ''}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
                    mine
                      ? 'bg-navy-600 text-white rounded-br-md'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 rounded-bl-md'
                  }`}
                >
                  {m.body}
                </div>
                <p className={`text-[10px] text-slate-400 mt-0.5 ${mine ? 'text-right' : ''}`}>
                  {fullName(adminById[m.author])} · {fmtDateTime(m.created_at)}
                </p>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-sm text-slate-400 text-center pt-8">
              Aucun message dans ce canal. Lance la discussion !
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 space-y-2">
          <div className="flex flex-wrap gap-1">
            {admins.filter((a) => a.id !== me).map((a) => (
              <button
                key={a.id}
                onClick={() => toggleMention(a.id, fullName(a))}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  mentions.includes(a.id)
                    ? 'bg-navy-600 text-white'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300'
                }`}
              >
                @{fullName(a)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Message rapide…"
              className="flex-1 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-800 dark:text-slate-100 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
            />
            <button
              onClick={send}
              disabled={!body.trim()}
              className="shrink-0 px-4 rounded-xl bg-navy-600 text-white font-bold hover:bg-navy-700 disabled:opacity-40"
              aria-label="Envoyer"
            >
              ➤
            </button>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
