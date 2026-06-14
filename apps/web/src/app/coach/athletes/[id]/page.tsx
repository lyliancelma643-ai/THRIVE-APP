'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { childAge, AssignedChild, CoachSession, THRIVE_SESSIONS } from '@/lib/coach';
import { ageGroupFromBirthDate } from '@/lib/catalog';

export default function CoachAthletePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const justSent = searchParams?.get('sent') === '1';

  const [child, setChild] = useState<AssignedChild | null>(null);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');

  const load = useCallback(async () => {
    if (!params?.id) return;
    const [childRes, sessionsRes] = await Promise.all([
      supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth, sport, family_id')
        .eq('id', params.id)
        .single(),
      supabase
        .from('sessions')
        .select('id, program_id, child_id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .eq('child_id', params.id)
        .order('session_number'),
    ]);
    setChild((childRes.data ?? null) as AssignedChild | null);
    setSessions((sessionsRes.data ?? []) as CoachSession[]);
    setLoading(false);
  }, [params?.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Filet de sécurité : crée le programme si l'automatisation n'a pas joué
  const createProgram = async () => {
    if (!user?.id || !child) return;
    setCreating(true);
    setError('');
    try {
      const group = ageGroupFromBirthDate(child.date_of_birth) ?? '8-11';
      const { data: program, error: progErr } = await supabase
        .from('programs')
        .insert({
          title: `Programme THRIVE 13 séances — ${child.first_name}`,
          description: 'Protocole 1:1 méthode THRIVE.',
          age_group: group,
          status: 'ACTIVE',
          total_sessions: 13,
          coach_id: user.id,
        })
        .select('id')
        .single();
      if (progErr || !program) throw progErr ?? new Error('Programme non créé');

      await supabase.from('program_enrollments').insert({ program_id: program.id, child_id: child.id });

      const monday = new Date();
      monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
      monday.setHours(17, 0, 0, 0);

      const rows = THRIVE_SESSIONS.map((s, i) => ({
        program_id: program.id,
        child_id: child.id,
        session_number: s.num,
        title: s.title,
        status: 'SCHEDULED',
        scheduled_at: new Date(monday.getTime() + i * 7 * 24 * 3600 * 1000).toISOString(),
        duration_minutes: 60,
      }));
      const { error: sessErr } = await supabase.from('sessions').insert(rows);
      if (sessErr) throw sessErr;
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création du programme');
    } finally {
      setCreating(false);
    }
  };

  const reschedule = async (sessionId: string) => {
    if (!newDate) return;
    await supabase
      .from('sessions')
      .update({ scheduled_at: new Date(newDate).toISOString() })
      .eq('id', sessionId);
    setRescheduling(null);
    setNewDate('');
    await load();
  };

  if (loading) {
    return <div className="max-w-4xl space-y-3">{Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-20 rounded-2xl bg-navy-50 animate-pulse" />
    ))}</div>;
  }

  if (!child) {
    return <p className="text-navy-600">Athlète introuvable ou non assigné.</p>;
  }

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
  const ageGroup = ageGroupFromBirthDate(child.date_of_birth);

  return (
    <div className="max-w-4xl">
      <Link href="/coach/athletes" className="text-sm text-navy-600/70 hover:text-navy-900">
        ← Mes athlètes
      </Link>

      <div className="flex items-center gap-4 mt-4 mb-6">
        <span className="w-14 h-14 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl font-bold">
          {child.first_name[0]}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">
            {child.first_name} {child.last_name ?? ''}
          </h1>
          <p className="text-sm text-navy-600/70">
            {childAge(child.date_of_birth) ?? '–'} ans (groupe {ageGroup}) · {child.sport ?? 'Hockey'} ·{' '}
            {completed}/13 séances validées
          </p>
        </div>
      </div>

      {justSent && (
        <p className="mb-4 p-3 rounded-xl bg-sage/40 text-navy-900 text-sm font-medium">
          ✓ Bilan envoyé — il est déjà visible sur le compte parent.
        </p>
      )}
      {error && <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {/* Prochaine séance à faire — accès direct */}
      {(() => {
        const next = sessions.find((s) => s.status !== 'COMPLETED');
        if (!next) return null;
        return (
          <Link
            href={`/coach/athletes/${child.id}/session/${next.id}`}
            className="block mb-6 p-6 rounded-2xl bg-navy-900 text-white hover:bg-navy-800 transition-colors"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sun mb-1">
              Prochaine séance · fiche {ageGroup} ans
            </p>
            <p className="font-display text-xl font-semibold mb-3">
              Séance {next.session_number} — {next.title}
            </p>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-sun text-navy-900 text-sm font-bold">
              ▶ Commencer la séance
            </span>
          </Link>
        );
      })()}

      {sessions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white shadow-card text-center">
          <h2 className="font-display text-xl font-semibold text-navy-900 mb-2">
            Aucun programme en cours
          </h2>
          <p className="text-sm text-navy-600/70 mb-6">
            Créez le programme complet : 13 séances hebdomadaires selon le protocole THRIVE.
          </p>
          <button
            onClick={createProgram}
            disabled={creating}
            className="px-6 py-3 rounded-full bg-navy-600 hover:bg-navy-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Créer le programme 13 séances'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white shadow-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-5">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${
                    s.status === 'COMPLETED' ? 'bg-sage text-navy-900' : 'bg-navy-50 text-navy-600'
                  }`}
                >
                  {s.status === 'COMPLETED' ? '✓' : s.session_number}
                </span>
                <Link
                  href={`/coach/athletes/${child.id}/session/${s.id}`}
                  className="flex-1 min-w-0 basis-[55%] group"
                >
                  <span className="block font-semibold text-navy-900 truncate group-hover:underline">
                    {s.title}
                  </span>
                  <span className="block text-xs text-navy-600/60">
                    {s.scheduled_at &&
                      new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    {' · '}Fiche complète {ageGroup} ans
                  </span>
                </Link>

                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    onClick={() => setRescheduling(rescheduling === s.id ? null : s.id)}
                    className="px-3 py-2 rounded-full text-xs font-medium bg-navy-50 text-navy-700 hover:bg-navy-100"
                  >
                    Replanifier
                  </button>
                  <Link
                    href={`/coach/athletes/${child.id}/session/${s.id}`}
                    className={`px-4 py-2 rounded-full text-xs font-bold ${
                      s.status === 'COMPLETED'
                        ? 'bg-sage text-navy-900 hover:bg-sage-dark'
                        : 'bg-sun text-navy-900 hover:bg-sun-dark'
                    }`}
                  >
                    {s.status === 'COMPLETED' ? 'Bilan envoyé ✓' : 'Faire la séance →'}
                  </Link>
                </div>
              </div>

              {rescheduling === s.id && (
                <div className="px-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-navy-50 pt-4">
                  <input
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full sm:w-auto min-w-0 border border-navy-100 rounded-xl px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => reschedule(s.id)}
                    className="px-4 py-2 rounded-full bg-navy-600 text-white text-xs font-bold"
                  >
                    Enregistrer la date
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
