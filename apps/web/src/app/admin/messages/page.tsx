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
  const filtered = conversations.filter(c => 
    c.p1.first_name.toLowerCase().includes(search.toLowerCase()) ||
    c.p1.last_name.toLowerCase().includes(search.toLowerCase()) ||
    c.p2.first_name.toLowerCase().includes(search.toLowerCase()) ||
    c.p2.last_name.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (first: string, last: string) => `${first[0]}${last[0]}`.toUpperCase();

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Messagerie</h1>
        <p className="text-[#a7c4bc] text-sm">Supervision des échanges entre parents et coachs</p>
      </div>

      <div className="flex gap-6 min-h-0 flex-1">
        {/* Liste conversations */}
        <div className="w-80 flex flex-col bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#a7c4bc]/10">
            <input
              className="w-full bg-[#a7c4bc]/20 border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-[#a7c4bc]/70 text-sm text-center py-10">Aucune conversation trouvée.</p>
            ) : filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full text-left p-4 transition-colors ${
                  selected?.id === conv.id 
                    ? 'bg-[#a7c4bc]/20' 
                    : 'bg-white/10 backdrop-blur-md hover:bg-white/10 backdrop-blur-md/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold bg-white/10 backdrop-blur-md/10 text-[#F7F5F2] border border-[#a7c4bc]/30 shrink-0">
                    {getInitials(conv.p1.first_name, conv.p1.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#F7F5F2] truncate mb-0.5">
                      {conv.p1.first_name} <span className="text-[#a7c4bc]/70 font-normal mx-1">↔</span> {conv.p2.first_name}
                    </p>
                    <p className="text-xs text-[#a7c4bc] truncate">
                      {conv.last_message ?? 'Nouvelle conversation'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Fenêtre messages */}
        <div className="flex-1 bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl flex flex-col overflow-hidden relative min-w-0">
          {!selected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-md/5">
              <div className="text-center">
                <p className="text-[#a7c4bc] text-sm">Sélectionnez une conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Chat */}
              <div className="px-6 py-4 border-b border-[#a7c4bc]/10 bg-white/10 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#F7F5F2] text-sm">
                    {selected.p1.first_name} {selected.p1.last_name} 
                    <span className="mx-2 text-gray-300 font-normal">↔</span> 
                    {selected.p2.first_name} {selected.p2.last_name}
                  </p>
                  <p className="text-xs text-[#a7c4bc] mt-0.5">
                    {selected.message_count} messages
                  </p>
                </div>
              </div>

              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/10 backdrop-blur-md custom-scrollbar">
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : messages.map((msg, index) => {
                  const isSenderP1 = msg.sender_id === selected.p1.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  return (
                    <div key={msg.id} className={`flex flex-col ${isSenderP1 ? 'items-start' : 'items-end'}`}>
                      {showHeader && (
                        <span className="text-xs font-medium text-[#a7c4bc]/70 mb-1.5 px-1">
                          {isSenderP1 ? selected.p1.first_name : selected.p2.first_name}
                        </span>
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 text-sm ${
                        isSenderP1 
                          ? 'bg-white/10 backdrop-blur-md/10 text-[#F7F5F2] rounded-2xl rounded-tl-sm' 
                          : 'bg-[#a7c4bc] text-white rounded-2xl rounded-tr-sm'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                          isSenderP1 ? 'text-[#a7c4bc] justify-start' : 'text-[#a7c4bc]/70 justify-end'
                        }`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.status === 'READ' && !isSenderP1 && (
                            <span className="ml-1">✓</span>
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
