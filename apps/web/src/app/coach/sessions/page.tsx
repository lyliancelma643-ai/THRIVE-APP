'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAssignedChildren, AssignedChild, CoachSession } from '@/lib/coach';

export default function CoachSessionsPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<AssignedChild[]>([]);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    const kids = await fetchAssignedChildren(user.id);
    setChildren(kids);
    if (kids.length > 0) {
      const { data } = await supabase
        .from('sessions')
        .select('id, program_id, child_id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .in('child_id', kids.map((k) => k.id))
        .order('session_number');
      setSessions((data ?? []) as CoachSession[]);
    } else {
      setSessions([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`coach-sessions-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_assignments' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, load]);

  // Le bouton unique : valider la séance -> visible "éclairée" chez le parent
  const validate = async (s: CoachSession) => {
    setBusyId(s.id);
    setError('');
    const { error: err } = await supabase
      .from('sessions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', s.id);
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  const unvalidate = async (s: CoachSession) => {
    setBusyId(s.id);
    const { error: err } = await supabase
      .from('sessions')
      .update({ status: 'SCHEDULED', completed_at: null })
      .eq('id', s.id);
    if (err) setError(err.message);
    await load();
    setBusyId(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-navy-50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-2">Séances</h1>
      <p className="text-navy-600/70 mb-8">
        Les 13 séances de chaque athlète. Validez une séance : elle s&apos;éclaire
        instantanément chez le parent.
      </p>

      {error && <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {children.length === 0 ? (
        <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
          Aucun athlète assigné pour l&apos;instant.
        </p>
      ) : (
        children.map((child) => {
          const childSessions = sessions.filter((s) => s.child_id === child.id);
          const done = childSessions.filter((s) => s.status === 'COMPLETED').length;
          return (
            <section key={child.id} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-full bg-sun text-navy-900 flex items-center justify-center font-bold">
                  {child.first_name[0]}
                </span>
                <h2 className="font-display text-xl font-semibold text-navy-900">
                  {child.first_name}
                </h2>
                <span className="text-sm text-navy-600/60">{done} / 13 validées</span>
              </div>

              <div className="space-y-2">
                {childSessions.map((s) => {
                  const isDone = s.status === 'COMPLETED';
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl bg-white shadow-card transition-opacity ${
                        isDone ? '' : 'opacity-90'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${
                          isDone ? 'bg-sage text-navy-900' : 'bg-navy-50 text-navy-600'
                        }`}
                      >
                        {s.session_number}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-navy-900 truncate">
                          {s.title}
                        </span>
                        <span className="block text-xs text-navy-600/60">
                          {s.scheduled_at &&
                            new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                              weekday: 'long', day: 'numeric', month: 'long',
                            })}
                        </span>
                      </span>

                      {isDone ? (
                        <button
                          onClick={() => unvalidate(s)}
                          disabled={busyId === s.id}
                          title="Annuler la validation"
                          className="px-4 py-2 rounded-full bg-sage text-navy-900 text-xs font-bold hover:bg-sage-dark disabled:opacity-50"
                        >
                          Validée ✓
                        </button>
                      ) : (
                        <button
                          onClick={() => validate(s)}
                          disabled={busyId === s.id}
                          className="px-4 py-2 rounded-full bg-navy-600 text-white text-xs font-bold hover:bg-navy-700 disabled:opacity-50"
                        >
                          {busyId === s.id ? '…' : 'Valider la séance'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
