'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { useAccessStore } from '@/lib/access';
import { usePlan } from '@/lib/entitlements';
import { featureUpgradeHint } from '@/lib/packs';
import { LockedBanner, GreyedSection } from '@/components/parent/AccessGate';
import { UpgradeHintBar } from '@/components/parent/PackGate';

// ─────────────────────────────────────────────────────────────────────────────
// Messagerie directe parent ↔ coach — exclusivité du forfait Performance
// (feature coachMessaging). L'UI reflète le droit ; l'enforcement réel est en
// RLS (migration 041 : INSERT restrictif). Tables : conversations / messages
// (migration 001), temps réel déjà publié.
// ─────────────────────────────────────────────────────────────────────────────

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type CoachInfo = { id: string; first_name: string; last_name: string } | null;

function MessagesPageInner() {
  const { user } = useAuthStore();
  const { children, selectedChildId, isLoading: childrenLoading } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [coach, setCoach] = useState<CoachInfo>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.id || !selectedChildId) {
      setCoach(null);
      setConversationId(null);
      setMessages([]);
      setLoading(false);
      return;
    }
    // 1) Le coach attribué à l'enfant sélectionné
    const { data: assignments } = await supabase
      .from('coach_assignments')
      .select('coach_id, profiles:coach_id (id, first_name, last_name)')
      .eq('child_id', selectedChildId)
      .eq('is_active', true)
      .limit(1);
    const assignment = (assignments ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    const coachInfo = (coachProfile as CoachInfo) ?? null;
    setCoach(coachInfo);
    if (!coachInfo) {
      setConversationId(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    // 2) La conversation (une par duo coach·parent) — créée au premier passage
    let convId: string | null = null;
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('coach_id', coachInfo.id)
      .eq('parent_id', user.id)
      .maybeSingle();
    if (existing?.id) {
      convId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ coach_id: coachInfo.id, parent_id: user.id, child_id: selectedChildId })
        .select('id')
        .maybeSingle();
      if (created?.id) {
        convId = created.id;
      } else {
        // Course perdue (unique coach_id+parent_id) : on relit
        const { data: again } = await supabase
          .from('conversations')
          .select('id')
          .eq('coach_id', coachInfo.id)
          .eq('parent_id', user.id)
          .maybeSingle();
        convId = again?.id ?? null;
      }
    }
    setConversationId(convId);

    // 3) Le fil
    if (convId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setMessages((msgs ?? []) as Msg[]);
    }
    setLoading(false);
  }, [user?.id, selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Temps réel : les réponses du coach arrivent sans recharger
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !conversationId || !user?.id || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content })
      .select('id, conversation_id, sender_id, content, created_at')
      .single();
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
      setDraft('');
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
    setSending(false);
  };

  if (!selectedChild && childrenLoading) {
    return <div className="h-40 rounded-2xl bg-white/[0.05] animate-pulse" aria-hidden />;
  }

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
          ✉
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">Ajoute un enfant pour échanger avec son coach THRIVE.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Messages</h1>
      <p className="text-white/55 mb-8">
        {coach ? (
          <>
            Échange direct avec{' '}
            <span className="font-medium text-white">
              {coach.first_name} {coach.last_name}
            </span>
            , coach THRIVE de {selectedChild.first_name}.
          </>
        ) : (
          <>La messagerie s&apos;ouvrira dès qu&apos;un coach sera attribué à {selectedChild.first_name}.</>
        )}
      </p>

      {loading ? (
        <div className="h-72 rounded-2xl bg-white/[0.05] animate-pulse" aria-hidden />
      ) : coach && conversationId ? (
        <div className="glass-navy rounded-2xl ring-1 ring-sage/40 flex flex-col">
          <div
            className="flex-1 overflow-y-auto p-5 md:p-6 space-y-3 min-h-[16rem] max-h-[calc(100dvh-24rem)]"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="text-sm text-white/45 text-center py-10">
                Écris ton premier message à {coach.first_name} — il te répondra ici.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      mine
                        ? 'bg-sage text-navy-900 rounded-2xl rounded-br-md'
                        : 'bg-white/[0.06] text-white/85 rounded-2xl rounded-bl-md'
                    }`}
                  >
                    {m.content}
                    <span
                      className={`block text-[10px] mt-1 ${mine ? 'text-navy-900/50' : 'text-white/35'}`}
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
          <form onSubmit={send} className="flex items-center gap-2 p-4 border-t border-white/10">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message…"
              aria-label="Écrire un message"
              className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-sun/50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="shrink-0 px-5 h-11 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Envoyer
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-navy rounded-2xl p-10 text-center border border-white/5">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-xl text-sun">
            ✉
          </div>
          <h3 className="font-display text-lg font-semibold text-white mb-2">Bientôt disponible</h3>
          <p className="text-sm text-white/55">
            Votre coach sera attribué très prochainement — la messagerie s&apos;ouvrira ici.
          </p>
        </div>
      )}
    </div>
  );
}

// Teaser pour les forfaits sans messagerie : structure visible, fil factice
// flouté (aucune donnée réelle), incitation à l'upgrade.
function MessagingTeaser() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Messages</h1>
      <p className="text-white/55 mb-8">Échange direct avec le coach THRIVE de votre enfant.</p>
      <div className="glass-navy rounded-2xl p-5 md:p-6">
        <div aria-hidden className="space-y-3 mb-4 blur-[5px] select-none pointer-events-none">
          <div className="flex justify-start">
            <div className="w-[62%] h-12 rounded-2xl rounded-bl-md bg-white/[0.08]" />
          </div>
          <div className="flex justify-end">
            <div className="w-[48%] h-10 rounded-2xl rounded-br-md bg-sage/40" />
          </div>
          <div className="flex justify-start">
            <div className="w-[55%] h-10 rounded-2xl rounded-bl-md bg-white/[0.08]" />
          </div>
        </div>
        <UpgradeHintBar pack="ESSENTIEL" hint={featureUpgradeHint('coachMessaging')} />
      </div>
    </div>
  );
}

// ── Garde d'accès : activation du compte, puis droit coachMessaging ──────────
export default function MessagesPage() {
  const { access, isLoading: accessLoading, refresh } = useAccessStore();
  const { selectedChildId } = useChildStore();
  const { can, isLoading: planLoading } = usePlan(selectedChildId);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (accessLoading || !access || planLoading) {
    return <div className="h-40 rounded-2xl bg-white/[0.05] animate-pulse" aria-hidden />;
  }
  if (!access.unlocked) {
    return (
      <div className="space-y-8">
        <LockedBanner />
        <GreyedSection title="Messages" subtitle="Échange direct avec le coach de votre enfant" />
      </div>
    );
  }
  if (!can('coachMessaging')) return <MessagingTeaser />;
  return <MessagesPageInner />;
}
