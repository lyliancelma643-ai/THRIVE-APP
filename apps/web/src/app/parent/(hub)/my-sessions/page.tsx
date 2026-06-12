'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { PHASE_LABELS, Phase } from '@/lib/catalog';
import { THRIVE_SESSIONS } from '@/lib/coach';

type OneToOneSession = {
  id: string;
  session_number: number | null;
  title: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  scheduled_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
};

type Report = {
  id: string;
  child_id: string;
  content: Record<string, unknown> | null;
  created_at: string;
};

type CoachInfo = { first_name: string; last_name: string } | null;

const STATUS_STYLES: Record<OneToOneSession['status'], { label: string; cls: string }> = {
  SCHEDULED: { label: 'Planifiée', cls: 'bg-navy-50 text-navy-600' },
  IN_PROGRESS: { label: 'En cours', cls: 'bg-sun text-navy-900' },
  COMPLETED: { label: 'Terminée', cls: 'bg-sage text-navy-900' },
  CANCELLED: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
  MISSED: { label: 'Manquée', cls: 'bg-red-50 text-red-500' },
};

function phaseOfSession(n: number | null): Phase {
  if (!n || n <= 2) return 'ANCRER';
  if (n <= 10) return 'DEVELOPPER';
  return 'INTEGRER';
}

export default function MySessionsPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [sessions, setSessions] = useState<OneToOneSession[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [coach, setCoach] = useState<CoachInfo>(null);
  const [loading, setLoading] = useState(true);
  const [openReport, setOpenReport] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setSessions([]);
      setReports([]);
      setCoach(null);
      setLoading(false);
      return;
    }
    const [sessionsRes, reportsRes, assignmentRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .eq('child_id', selectedChildId)
        .order('session_number', { ascending: true, nullsFirst: false }),
      supabase
        .from('reports')
        .select('id, child_id, content, created_at')
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false }),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
    ]);

    setSessions((sessionsRes.data ?? []) as OneToOneSession[]);
    setReports((reportsRes.data ?? []) as Report[]);
    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Mise à jour automatique en temps réel (séances + bilans)
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`my-sessions-${selectedChildId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `child_id=eq.${selectedChildId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: `child_id=eq.${selectedChildId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  if (!selectedChild) {
    return (
      <EmptyState
        title="Aucun profil enfant"
        body="Ajoute un enfant pour voir son programme de 13 séances avec son coach THRIVE."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-navy-50 animate-pulse" />
        ))}
      </div>
    );
  }

  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-2">Mes séances</h1>
      <p className="text-navy-600/70 mb-8">
        Le programme 1:1 de {selectedChild.first_name}
        {coach ? (
          <>
            {' '}avec <span className="font-medium text-navy-900">{coach.first_name} {coach.last_name}</span>, coach THRIVE
          </>
        ) : null}
        . Mise à jour automatique après chaque séance.
      </p>

      {/* Jauge de progression */}
      <div className="mb-10 p-6 rounded-2xl glass-navy text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-lg">Progression du programme</span>
          <span className="text-sun font-bold">{completedCount} / 13</span>
        </div>
        <div className="h-2.5 rounded-full bg-navy-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sage to-sun transition-all"
            style={{ width: `${(completedCount / 13) * 100}%` }}
          />
        </div>
        {sessions.length === 0 && (
          <p className="text-xs text-navy-100/70 mt-3">
            Les séances s&apos;activeront dès qu&apos;un coach THRIVE sera attribué à{' '}
            {selectedChild.first_name}.
          </p>
        )}
      </div>

      {/* Les 13 séances : grisées tant que le coach n'a pas validé,
          éclairées dès la validation (mise à jour en direct) */}
      <div className="space-y-3">
        {THRIVE_SESSIONS.map((tpl) => {
          const s = sessions.find((x) => x.session_number === tpl.num) ?? null;
          const isDone = s?.status === 'COMPLETED';
          const phase = phaseOfSession(tpl.num);
          const report = isDone && s
            ? reports.find(
                (r) =>
                  (r.content as any)?.session_id === s.id ||
                  (r.content as any)?.session_number === s.session_number
              ) ?? null
            : null;
          const rowId = s?.id ?? `tpl-${tpl.num}`;
          const isOpen = openReport === rowId;
          const hasDetails = Boolean(report || (isDone && s?.coach_notes));

          return (
            <div
              key={rowId}
              className={`rounded-2xl overflow-hidden transition-all duration-500 ${
                isDone
                  ? 'glass ring-1 ring-sage/60'
                  : 'bg-navy-900/75 backdrop-blur-md opacity-80'
              }`}
            >
              <button
                className="w-full flex items-center gap-4 p-5 text-left"
                onClick={() => hasDetails && setOpenReport(isOpen ? null : rowId)}
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${
                    isDone ? 'bg-sage text-navy-900' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {isDone ? '✓' : tpl.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block font-semibold truncate ${
                      isDone ? 'text-navy-900' : 'text-white/55'
                    }`}
                  >
                    {s?.title ?? tpl.title}
                  </span>
                  <span
                    className={`block text-xs mt-0.5 ${
                      isDone ? 'text-navy-600/60' : 'text-white/35'
                    }`}
                  >
                    {PHASE_LABELS[phase]}
                    {s?.scheduled_at &&
                      ` · ${new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}`}
                  </span>
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isDone ? 'bg-sage text-navy-900' : 'bg-white/10 text-white/45'
                  }`}
                >
                  {isDone ? 'Validée par le coach' : 'À venir'}
                </span>
                {hasDetails && (
                  <span className="text-navy-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                )}
              </button>

              {isOpen && hasDetails && s && (
                <div className="px-5 pb-5 pt-1 border-t border-navy-50">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-navy-600/60 mb-2 mt-3">
                    Bilan du coach
                  </h4>
                  {s.coach_notes && (
                    <p className="text-sm text-navy-900/80 whitespace-pre-line mb-3">
                      {s.coach_notes}
                    </p>
                  )}
                  {report?.content && (
                    <div className="space-y-2">
                      {Object.entries(report.content)
                        .filter(
                          ([k, v]) =>
                            !['session_id', 'session_number'].includes(k) &&
                            v !== '' &&
                            v !== null
                        )
                        .map(([key, value]) =>
                          key === 'observations' && value && typeof value === 'object' ? (
                            <div key={key} className="pt-2">
                              <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/60 mb-2">
                                Observations du coach
                              </span>
                              <div className="space-y-1.5">
                                {Object.entries(value as Record<string, number>).map(
                                  ([ind, note]) => (
                                    <div
                                      key={ind}
                                      className="flex items-center justify-between gap-3 text-sm"
                                    >
                                      <span className="text-navy-900/80">{ind}</span>
                                      <span className="flex gap-1 shrink-0">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                          <span
                                            key={n}
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              n <= Number(note)
                                                ? 'bg-navy-600'
                                                : 'bg-navy-100'
                                            }`}
                                          />
                                        ))}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ) : (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-navy-900 capitalize">
                                {key.replace(/_/g, ' ')} :{' '}
                              </span>
                              <span className="text-navy-900/75">{String(value)}</span>
                            </div>
                          )
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-navy-50 flex items-center justify-center text-2xl">
        ★
      </div>
      <h2 className="font-display text-2xl font-semibold text-navy-900 mb-3">{title}</h2>
      <p className="text-navy-600/70">{body}</p>
    </div>
  );
}
