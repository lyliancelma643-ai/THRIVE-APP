'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ConvRow {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  p1: Profile;
  p2: Profile;
  last_message?: string;
  message_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  status: string;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selected, setSelected] = useState<ConvRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selected) fetchMessages(selected.id);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        p1:profiles!conversations_participant_1_fkey(id, first_name, last_name, role),
        p2:profiles!conversations_participant_2_fkey(id, first_name, last_name, role)
      `)
      .order('last_message_at', { ascending: false });

    if (!data) { setIsLoading(false); return; }

    const enriched = await Promise.all(
      data.map(async (c: any) => {
        const { data: lastMsg } = await supabase
          .from('messages').select('content').eq('conversation_id', c.id)
          .order('created_at', { ascending: false }).limit(1).single();
        const { count } = await supabase
          .from('messages').select('*', { count: 'exact', head: true })
          .eq('conversation_id', c.id);
        return { ...c, last_message: lastMsg?.content, message_count: count ?? 0 };
      })
    );
    setConversations(enriched);
    setIsLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setMsgLoading(false);
  };

  const filtered = conversations.filter((c) => {
    const names = `${c.p1.first_name} ${c.p1.last_name} ${c.p2.first_name} ${c.p2.last_name}`.toLowerCase();
    return names.includes(search.toLowerCase());
  });

  const formatTime = (s: string) => new Date(s).toLocaleString('fr-CA', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  const getInitials = (f: string, l: string) => `${f[0]??''}${l[0]??''}`.toUpperCase();

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Liste conversations */}
      <div className="w-80 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-3">Messages 💬</h1>
          <input
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoading ? (
            <p className="text-gray-400 text-sm p-4">Chargement...</p>
          ) : filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className={`w-full text-left p-4 rounded-2xl transition-colors ${
                selected?.id === conv.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  selected?.id === conv.id ? 'bg-white text-black' : 'bg-gray-100 text-gray-700'
                }`}>
                  {getInitials(conv.p1.first_name, conv.p1.last_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {conv.p1.first_name} ↔️ {conv.p2.first_name}
                  </p>
                  <p className={`text-xs truncate ${
                    selected?.id === conv.id ? 'text-gray-300' : 'text-gray-400'
                  }`}>{conv.last_message ?? 'Pas encore de message'}</p>
                </div>
                <span className={`text-xs ${
                  selected?.id === conv.id ? 'text-gray-400' : 'text-gray-300'
                }`}>{conv.message_count}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fenêtre messages */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p>Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                {getInitials(selected.p1.first_name, selected.p1.last_name)}
              </div>
              <div>
                <p className="font-bold">{selected.p1.first_name} {selected.p1.last_name} ↔️ {selected.p2.first_name} {selected.p2.last_name}</p>
                <p className="text-xs text-gray-400">{selected.message_count} messages · dernier {formatTime(selected.last_message_at)}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {msgLoading ? (
                <p className="text-gray-400 text-sm text-center">Chargement...</p>
              ) : messages.map((msg) => {
                const isSenderP1 = msg.sender_id === selected.p1.id;
                return (
                  <div key={msg.id} className={`flex ${
                    isSenderP1 ? 'justify-start' : 'justify-end'
                  }`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-3 ${
                      isSenderP1 ? 'bg-gray-100 text-gray-900' : 'bg-black text-white'
                    }`}>
                      <p className="text-xs font-semibold mb-1 opacity-60">
                        {isSenderP1 ? `${selected.p1.first_name}` : `${selected.p2.first_name}`}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 opacity-50 text-right`}>
                        {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        {msg.status === 'READ' && ' ✓✓'}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
