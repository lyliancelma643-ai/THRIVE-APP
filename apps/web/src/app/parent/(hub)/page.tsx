'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import {
  VideoSession,
  PHASE_LABELS,
  ageGroupFromBirthDate,
  themeAccent,
} from '@/lib/catalog';
import { SessionRow } from '@/components/parent/SessionRow';

export default function ParentHomePage() {
  const { user } = useAuthStore();
  const { children, selectedChildId } = useChildStore();
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const childAgeGroup = ageGroupFromBirthDate(selectedChild?.date_of_birth ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from('video_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('lang', 'fr')
        .order('session_number');

      if (childAgeGroup) query = query.eq('age_group', childAgeGroup);

      const { data } = await query;
      if (!cancelled) {
        // Sans enfant sélectionné, on évite les triplons : une seule tranche d'âge
        const list = (data ?? []) as VideoSession[];
        setSessions(childAgeGroup ? list : list.filter((s) => s.age_group === '8-11'));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childAgeGroup]);

  useEffect(() => {
    if (!selectedChildId) return;
    (async () => {
      const { data } = await supabase
        .from('video_session_runs')
        .select('video_session_id, completed_at')
        .eq('child_id', selectedChildId)
        .not('completed_at', 'is', null);
      setCompletedIds(new Set((data ?? []).map((r) => r.video_session_id)));
    })();
  }, [selectedChildId]);

  const nextSession = useMemo(
    () => sessions.find((s) => !completedIds.has(s.id)) ?? sessions[0],
    [sessions, completedIds]
  );

  const byPhase = useMemo(
    () => ({
      ANCRER: sessions.filter((s) => s.phase === 'ANCRER'),
      DEVELOPPER: sessions.filter((s) => s.phase === 'DEVELOPPER'),
      INTEGRER: sessions.filter((s) => s.phase === 'INTEGRER'),
    }),
    [sessions]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-72 rounded-3xl bg-navy-100 animate-pulse" />
        <div className="h-40 rounded-2xl bg-navy-50 animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero — séance suivante */}
      {nextSession && (
        <Link href={`/parent/session/${nextSession.id}`} className="block group mb-12">
          <div
            className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${themeAccent(nextSession.theme).glow} shadow-card group-hover:shadow-card-hover transition-all`}
          >
            <span className="absolute -right-4 -bottom-16 font-display text-[16rem] leading-none text-white/10 select-none">
              {nextSession.session_number}
            </span>
            <div className="relative px-10 py-14 max-w-2xl">
              <p className="text-sun text-xs font-bold uppercase tracking-[0.2em] mb-3">
                {completedIds.size > 0 ? 'Continuer le parcours' : 'Commencer le parcours'}
                {selectedChild ? ` · ${selectedChild.first_name}` : ''}
              </p>
              <h1 className="font-display text-4xl text-white font-semibold mb-3">
                {nextSession.title}
              </h1>
              <p className="text-navy-100/90 mb-2">{nextSession.subtitle}</p>
              <p className="text-sage text-sm mb-8">
                Séance {nextSession.session_number} · {PHASE_LABELS[nextSession.phase]} ·{' '}
                {nextSession.duration_minutes} min · {nextSession.age_group} ans
              </p>
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sun text-navy-900 font-bold text-sm group-hover:bg-sun-dark transition-colors">
                ▶ Lancer la séance
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Progression */}
      {sessions.length > 0 && (
        <div className="mb-12 p-6 rounded-2xl bg-white shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Parcours 20 minutes{selectedChild ? ` de ${selectedChild.first_name}` : ''}
            </h2>
            <span className="text-sm text-navy-600 font-medium">
              {completedIds.size} / {sessions.length} séances
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-navy-50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy-600 to-sage transition-all"
              style={{ width: `${(completedIds.size / Math.max(sessions.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Rangées par phase (style Apple Fitness+) */}
      <SessionRow
        title={PHASE_LABELS.ANCRER}
        subtitle="Créer l'alliance, mesurer le point de départ, fixer le cap."
        sessions={byPhase.ANCRER}
        completedIds={completedIds}
      />
      <SessionRow
        title={PHASE_LABELS.DEVELOPPER}
        subtitle="Apprendre chaque life skill, séance par séance."
        sessions={byPhase.DEVELOPPER}
        completedIds={completedIds}
      />
      <SessionRow
        title={PHASE_LABELS.INTEGRER}
        subtitle="Consolider, transférer hors du sport, célébrer."
        sessions={byPhase.INTEGRER}
        completedIds={completedIds}
      />
    </div>
  );
}
