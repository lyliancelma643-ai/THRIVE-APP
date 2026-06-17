'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';

// ─── Types ───────────────────────────────────────────────────────────────────
type Gauge = { global: number; sample_size: number; by_skill: Record<string, number> };
type LogEntry = {
  id: string;
  event_type: 'VIDEO_RUN' | 'SESSION_1TO1' | 'QUESTIONNAIRE' | 'BADGE' | 'REPORT' | 'NOTE';
  title: string;
  summary: string | null;
  created_at: string;
};

// Libellés lisibles pour les dimensions (clé brute → label) ; fallback = humanisé
const SKILL_LABELS: Record<string, string> = {
  confiance: 'Confiance',
  competence: 'Compétence',
  curiosite: 'Curiosité',
  energie: 'Énergie',
  gestion_emotionnelle: 'Gestion émotionnelle',
  concentration: 'Concentration',
  motivation: 'Motivation',
};
const humanize = (k: string) =>
  SKILL_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');

const EVENT_META: Record<LogEntry['event_type'], { icon: string; tint: string }> = {
  VIDEO_RUN: { icon: '▶', tint: 'bg-sun/20 text-sun' },
  SESSION_1TO1: { icon: '★', tint: 'bg-sage/20 text-sage' },
  QUESTIONNAIRE: { icon: '✎', tint: 'bg-navy-100/20 text-navy-100' },
  BADGE: { icon: '✦', tint: 'bg-sun/20 text-sun' },
  REPORT: { icon: '✉', tint: 'bg-sage/20 text-sage' },
  NOTE: { icon: '•', tint: 'bg-white/15 text-white/70' },
};

export default function ProgressPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [gauge, setGauge] = useState<Gauge | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setGauge(null);
      setLog([]);
      setLoading(false);
      return;
    }
    const [gaugeRes, logRes] = await Promise.all([
      supabase.rpc('gauge_summary', { p_child_id: selectedChildId }),
      supabase
        .from('progress_log')
        .select('id, event_type, title, summary, created_at')
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setGauge((gaugeRes.data as Gauge) ?? { global: 0, sample_size: 0, by_skill: {} });
    setLog((logRes.data ?? []) as LogEntry[]);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Mise à jour temps réel des scores + journal
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`progress-${selectedChildId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_scores', filter: `child_id=eq.${selectedChildId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress_log', filter: `child_id=eq.${selectedChildId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">↗</div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">Ajoute un enfant pour suivre ses progrès et son journal.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-44 rounded-3xl bg-white/[0.04] animate-pulse" />
        <div className="h-64 rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  const dims = Object.entries(gauge?.by_skill ?? {});
  const hasScores = (gauge?.sample_size ?? 0) > 0;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">
        Progrès de {selectedChild.first_name}
      </h1>
      <p className="text-white/55 mb-8">Jauges de compétences et journal de progression — mis à jour automatiquement.</p>

      {/* Jauge globale */}
      <div className="mb-8 p-6 md:p-8 rounded-3xl glass-navy">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-lg text-white">Jauge globale</span>
          <span className="text-sun font-bold text-2xl font-display">{gauge?.global ?? 0}<span className="text-base text-white/40">/100</span></span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sage to-sun transition-all duration-700"
            style={{ width: `${gauge?.global ?? 0}%` }}
          />
        </div>
        {!hasScores && (
          <p className="text-xs text-navy-100/70 mt-4">
            Les jauges s&apos;allumeront après les premières séances notées et questionnaires de {selectedChild.first_name}.
          </p>
        )}
      </div>

      {/* Scorecards par dimension */}
      {hasScores && dims.length > 0 && (
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dims.map(([key, val]) => (
            <div key={key} className="p-4 rounded-2xl glass-navy">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{humanize(key)}</span>
                <span className="text-sm font-bold text-sun">{val}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sage to-sun" style={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Journal */}
      <h2 className="font-display text-xl font-semibold text-white mb-4">Journal</h2>
      {log.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/[0.04] text-white/55 text-sm">
          Le journal se remplira au fil des séances vidéo, des séances coach et des bilans.
        </div>
      ) : (
        <ol className="relative border-l border-white/10 ml-3 space-y-5">
          {log.map((e) => {
            const meta = EVENT_META[e.event_type] ?? EVENT_META.NOTE;
            return (
              <li key={e.id} className="ml-5">
                <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full text-xs ${meta.tint}`}>
                  {meta.icon}
                </span>
                <div className="glass-navy rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white text-sm">{e.title}</span>
                    <time className="text-xs text-white/40 shrink-0">
                      {new Date(e.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                    </time>
                  </div>
                  {e.summary && <p className="text-sm text-white/65 mt-1">{e.summary}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
