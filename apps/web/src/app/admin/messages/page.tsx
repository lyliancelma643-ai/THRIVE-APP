'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

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
  const getInitials = (f: string, l: string) => `${f?.[0]??''}${l?.[0]??''}`.toUpperCase();

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)]">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Messagerie 💬</h1>
        <p className="text-slate-500 font-medium">Supervision des échanges entre parents et coachs</p>
      </div>

      <div className="flex gap-6 h-[calc(100%-6rem)]">
        {/* Liste conversations */}
        <div className="w-1/3 flex flex-col bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium transition-all outline-none"
                placeholder="Chercher une conversation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10 font-medium">Aucune conversation trouvée.</p>
            ) : filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
                  selected?.id === conv.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                    : 'bg-white text-slate-900 border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${
                    selected?.id === conv.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {getInitials(conv.p1.first_name, conv.p1.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate mb-0.5 ${selected?.id === conv.id ? 'text-white' : 'text-slate-900'}`}>
                      {conv.p1.first_name} <span className="opacity-50 font-normal mx-1">↔️</span> {conv.p2.first_name}
                    </p>
                    <p className={`text-xs truncate font-medium ${
                      selected?.id === conv.id ? 'text-blue-100' : 'text-slate-500'
                    }`}>{conv.last_message ?? 'Nouvelle conversation'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selected?.id === conv.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{conv.message_count} msg</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fenêtre messages */}
        <div className="flex-1 bg-white rounded-[24px] shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
          {!selected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50">
              <div className="text-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-6">
                  <span className="text-5xl">💬</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune conversation sélectionnée</h3>
                <p className="text-slate-500">Cliquez sur une conversation pour voir l'historique.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Chat */}
              <div className="px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                    {getInitials(selected.p1.first_name, selected.p1.last_name)}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-lg">
                      {selected.p1.first_name} {selected.p1.last_name} 
                      <span className="mx-2 text-slate-300 font-normal">↔️</span> 
                      {selected.p2.first_name} {selected.p2.last_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {selected.message_count} messages échangés
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : messages.map((msg, index) => {
                  const isSenderP1 = msg.sender_id === selected.p1.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={`flex flex-col ${isSenderP1 ? 'items-start' : 'items-end'}`}>
                      {showHeader && (
                        <span className="text-xs font-bold text-slate-400 mb-1.5 px-1">
                          {isSenderP1 ? `${selected.p1.first_name} ${selected.p1.last_name}` : `${selected.p2.first_name} ${selected.p2.last_name}`}
                        </span>
                      )}
                      <div className={`max-w-md relative group ${
                        isSenderP1 
                          ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm' 
                          : 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-blue-500/20'
                      } px-5 py-3.5`}>
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${
                          isSenderP1 ? 'text-slate-400 justify-start' : 'text-blue-200 justify-end'
                        }`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.status === 'READ' && !isSenderP1 && (
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} className="h-4" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
