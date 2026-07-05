'use client';

// Parcours des 13 séances — statut par séance (à venir / en cours / complétée /
// manquée / reportée) + notes du coach + replanification. Crée le programme si
// l'automatisation ne l'a pas fait.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { CoachSession, THRIVE_SESSIONS } from '@/lib/coach';
import { ageGroupFromBirthDate } from '@/lib/catalog';
import { SESSION_STATUS_META, SessionStatus } from '@/lib/bilan';
import { Btn } from './ui';

const EDITABLE_STATUSES: SessionStatus[] = [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'POSTPONED', 'CANCELLED',
];

export function SessionsEditor({
  childId,
  dateOfBirth,
  onChange,
}: {
  childId: string;
  dateOfBirth: string | null;
  onChange?: () => void;
}) {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select('id, program_id, child_id, session_number, title, status, scheduled_at, completed_at, coach_notes')
      .eq('child_id', childId)
      .order('session_number');
    setSessions((data ?? []) as CoachSession[]);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const createProgram = async () => {
    if (!user?.id) return;
    setCreating(true);
    setError('');
    try {
      const group = ageGroupFromBirthDate(dateOfBirth) ?? '8-11';
      const { data: program, error: progErr } = await supabase
        .from('programs')
        .insert({
          title: 'Programme THRIVE 13 séances',
          description: 'Protocole 1:1 méthode THRIVE.',
          age_group: group,
          status: 'ACTIVE',
          total_sessions: 13,
          coach_id: user.id,
        })
        .select('id')
        .single();
      if (progErr || !program) throw progErr ?? new Error('Programme non créé');

      await supabase.from('program_enrollments').insert({ program_id: program.id, child_id: childId });

      const monday = new Date();
      monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
      monday.setHours(17, 0, 0, 0);
      const rows = THRIVE_SESSIONS.map((s, i) => ({
        program_id: program.id,
        child_id: childId,
        session_number: s.num,
        title: s.title,
        status: 'SCHEDULED',
        scheduled_at: new Date(monday.getTime() + i * 7 * 24 * 3600 * 1000).toISOString(),
        duration_minutes: 60,
      }));
      const { error: sessErr } = await supabase.from('sessions').insert(rows);
      if (sessErr) throw sessErr;
      await load();
      onChange?.();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création du programme');
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (s: CoachSession, status: SessionStatus) => {
    setSessions((xs) => xs.map((x) => (x.id === s.id ? { ...x, status } : x)));
    const patch: Record<string, unknown> = { status };
    if (status === 'COMPLETED') patch.completed_at = new Date().toISOString();
    if (status !== 'COMPLETED') patch.completed_at = null;
    const { error: e } = await supabase.from('sessions').update(patch).eq('id', s.id);
    if (e) setError(e.message);
    onChange?.();
  };

  const saveNotes = async (id: string, notes: string) => {
    await supabase.from('sessions').update({ coach_notes: notes }).eq('id', id);
    onChange?.();
  };

  const doReschedule = async (id: string) => {
    if (!newDate) return;
    await supabase.from('sessions').update({ scheduled_at: new Date(newDate).toISOString() }).eq('id', id);
    setReschedule(null);
    setNewDate('');
    await load();
    onChange?.();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 mb-4">
          Aucun programme. Créez les 13 séances hebdomadaires du protocole THRIVE.
        </p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <Btn onClick={createProgram} disabled={creating}>
          {creating ? 'Création…' : 'Créer le programme 13 séances'}
        </Btn>
      </div>
    );
  }

  const completed = sessions.filter((s) => s.status === 'COMPLETED').length;

  return (
    <div className="space-y-2">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
      <p className="text-xs text-gray-500 mb-1">{completed}/13 séances complétées</p>

      {sessions.map((s) => {
        const meta = SESSION_STATUS_META[s.status as SessionStatus] ?? SESSION_STATUS_META.SCHEDULED;
        return (
          <div key={s.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-50 text-navy-600'
                }`}
              >
                {s.status === 'COMPLETED' ? '✓' : s.session_number}
              </span>
              <div className="flex-1 min-w-0 basis-[45%]">
                <p className="text-sm font-semibold text-navy-900 truncate">{s.title}</p>
                <p className="text-[11px] text-gray-400">
                  {s.scheduled_at &&
                    new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                </p>
              </div>

              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${meta.tone}`}>
                {meta.label}
              </span>

              <select
                value={s.status}
                onChange={(e) => setStatus(s, e.target.value as SessionStatus)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white cursor-pointer"
              >
                {EDITABLE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {SESSION_STATUS_META[st].label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setOpenNotes(openNotes === s.id ? null : s.id)}
                className="text-xs px-2 py-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 cursor-pointer"
              >
                {s.coach_notes ? 'Note ✎' : 'Note +'}
              </button>
              <button
                onClick={() => setReschedule(reschedule === s.id ? null : s.id)}
                className="text-xs px-2 py-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 cursor-pointer"
              >
                Date
              </button>
            </div>

            {openNotes === s.id && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                <textarea
                  defaultValue={s.coach_notes ?? ''}
                  onBlur={(e) => saveNotes(s.id, e.target.value)}
                  rows={2}
                  placeholder="Notes du coach pour cette séance…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <p className="text-[11px] text-gray-400 mt-1">Enregistré automatiquement.</p>
              </div>
            )}

            {reschedule === s.id && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <Btn onClick={() => doReschedule(s.id)}>Enregistrer la date</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
