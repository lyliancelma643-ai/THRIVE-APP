'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

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

export default function ParentMessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selected, setSelected] = useState<ConvRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) fetchConversations();
  }, [user?.id]);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id);
      
      // Marquer les messages comme lus
      supabase
        .from('messages')
        .update({ status: 'READ' })
        .eq('conversation_id', selected.id)
        .neq('sender_id', user?.id)
        .eq('status', 'DELIVERED')
        .then(() => fetchConversations());
    }
  }, [selected, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        p1:profiles!conversations_participant_1_fkey(id, first_name, last_name, role),
        p2:profiles!conversations_participant_2_fkey(id, first_name, last_name, role)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selected || !user) return;

    const tempMsg = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      status: 'SENT',
      conversation_id: selected.id
    };

    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');

    await supabase.from('messages').insert({
      conversation_id: selected.id,
      sender_id: user.id,
      content: tempMsg.content,
    });
    
    // Mettre à jour l'heure du dernier message
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', selected.id);

    fetchConversations();
    fetchMessages(selected.id);
  };

  const filtered = conversations.filter(c => {
    const other = c.p1?.id === user?.id ? c.p2 : c.p1;
    if (!other) return false;
    return (other?.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
           (other?.last_name || '').toLowerCase().includes(search.toLowerCase());
  });

  const getInitials = (first: string, last: string) => `${first[0] || ''}${last[0] || ''}`.toUpperCase();

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-white mb-1">Messages</h1>
        <p className="text-white/70 text-sm">Discutez avec les coachs de vos enfants.</p>
      </div>

      <div className="flex gap-6 min-h-0 flex-1">
        {/* Liste conversations */}
        <div className="w-80 flex flex-col bg-white/10 backdrop-blur-md border border-brand-tertiary/30 shadow-sm rounded-xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#a7c4bc]/10">
            <input
              className="w-full bg-[#a7c4bc]/20 border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none"
              placeholder="Rechercher un coach..."
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
            ) : filtered.map((conv) => {
              const other = conv.p1?.id === user?.id ? conv.p2 : conv.p1;
              if (!other) return null;
              return (
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
                      {getInitials(other.first_name, other.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#F7F5F2] truncate mb-0.5">
                        {other.first_name} {other.last_name}
                      </p>
                      <p className="text-xs text-[#a7c4bc] truncate">
                        {conv.last_message ?? 'Nouvelle conversation'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fenêtre messages */}
        <div className="flex-1 bg-white/10 backdrop-blur-md border border-brand-tertiary/30 shadow-sm rounded-xl flex flex-col overflow-hidden relative min-w-0">
          {!selected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-md/5">
              <div className="text-center">
                <p className="text-[#a7c4bc] text-sm">Sélectionnez une conversation</p>
              </div>
            </div>
          ) : (() => {
            const other = selected.p1?.id === user?.id ? selected.p2 : selected.p1;
            if (!other) return null;
            return (
            <>
              {/* Header Chat */}
              <div className="px-6 py-4 border-b border-[#a7c4bc]/10 bg-white/10 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#F7F5F2] text-sm">
                    {other.first_name} {other.last_name}
                  </p>
                  <p className="text-xs text-[#a7c4bc] mt-0.5">
                    {other.role}
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
                  const isSenderMe = msg.sender_id === user?.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                  return (
                     <div key={msg.id} className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'}`}>
                      {showHeader && !isSenderMe && (
                        <span className="text-xs font-medium text-[#a7c4bc]/70 mb-1.5 px-1">
                          {other.first_name}
                        </span>
                      )}
                      <div className={`max-w-[70%] px-4 py-2.5 text-sm ${
                        isSenderMe 
                          ? 'bg-white/10 backdrop-blur-md/10 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-white/10 backdrop-blur-md/10 text-[#F7F5F2] rounded-2xl rounded-tl-sm' 
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] ${
                          isSenderMe ? 'text-[#a7c4bc]/70 justify-end' : 'text-[#a7c4bc] justify-start'
                        }`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.status === 'READ' && isSenderMe && (
                            <span className="ml-1 text-blue-300">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} className="h-4" />
              </div>
              
              {/* Input Area */}
              <div className="p-4 border-t border-[#a7c4bc]/10 bg-white/10 backdrop-blur-md">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 bg-[#a7c4bc]/20 border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-xl px-4 py-2.5 text-sm transition-colors outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-white/10 backdrop-blur-md/10 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:bg-white/10 backdrop-blur-md/10/90"
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
