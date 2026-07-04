'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import {
  VideoSession,
  InteractionPoint,
  PHASE_LABELS,
  themeAccent,
} from '@/lib/catalog';
import { InteractivePlayer } from '@/components/player/InteractivePlayer';

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [session, setSession] = useState<VideoSession | null>(null);
  const [interactions, setInteractions] = useState<InteractionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      setLoading(true);
      const [sessionRes, interactionsRes] = await Promise.all([
        supabase.from('video_sessions').select('*').eq('id', params.id).single(),
        supabase
          .from('video_interaction_points')
          .select('*')
          .eq('video_session_id', params.id)
          .order('timecode_seconds'),
      ]);
      setSession((sessionRes.data ?? null) as VideoSession | null);
      setInteractions((interactionsRes.data ?? []) as InteractionPoint[]);
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-white/60 mb-4">Séance introuvable.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-full glass-navy text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          ← Retour
        </button>
      </div>
    );
  }

  const accent = themeAccent(session.theme);

  return (
    <div className="max-w-5xl">
      <Link
        href="/parent/fitness"
        className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white active:text-white mb-4 py-3 pr-4 -my-1 transition-colors select-none"
      >
        ← Retour au Fitness
      </Link>

      {started && selectedChild && user ? (
        <InteractivePlayer
          session={session}
          interactions={interactions}
          childId={selectedChild.id}
          parentId={user.id}
        />
      ) : (
        <div
          className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${accent.glow} shadow-card`}
        >
          <span className="absolute -right-4 -bottom-16 font-display text-[14rem] leading-none text-white/10 select-none">
            {session.session_number}
          </span>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            {selectedChild ? (
              <>
                <p className="text-sun text-xs font-bold uppercase tracking-[0.2em] mb-4">
                  Prêt avec {selectedChild.first_name} ?
                </p>
                <button
                  onClick={() => setStarted(true)}
                  className="w-20 h-20 rounded-full bg-sun text-navy-900 flex items-center justify-center text-3xl shadow-card hover:scale-105 transition-transform mb-4"
                >
                  ▶
                </button>
                <p className="text-navy-100/80 text-sm">
                  {interactions.length} moments interactifs pendant la vidéo
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-display text-xl mb-4">
                  Sélectionne d&apos;abord un profil enfant
                </p>
                <Link
                  href="/parent/select-profile"
                  className="px-6 py-3 rounded-full bg-sun text-navy-900 font-bold text-sm"
                >
                  + Ajouter un enfant
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Infos séance */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${accent.chip}`}>
              {session.theme}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-white/10 text-white/70">
              {PHASE_LABELS[session.phase]}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-white mb-1">
            {session.title}
          </h1>
          <p className="text-white/60 mb-4">{session.subtitle}</p>
          <p className="text-white/75 leading-relaxed">{session.description}</p>
        </div>

        <div className="p-5 rounded-2xl glass-navy h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-4">
            Cette séance
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/55">Durée</dt>
              <dd className="font-medium text-white">{session.duration_minutes} min</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Âge</dt>
              <dd className="font-medium text-white">{session.age_group} ans</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Life skill</dt>
              <dd className="font-medium text-white text-right">{session.life_skill}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/55">Interactions</dt>
              <dd className="font-medium text-white">{interactions.length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
