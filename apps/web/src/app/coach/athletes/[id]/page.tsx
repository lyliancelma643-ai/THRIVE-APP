'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { childAge, AssignedChild, CoachSession, THRIVE_SESSIONS } from '@/lib/coach';

type ReportForm = {
  performance_summary: string;
  success_count: string;
  forces_via: string;
  transfer_notes: string;
  home_recommendations: string;
  coach_message_parent: string;
  rpe: string;
};

const EMPTY_FORM: ReportForm = {
  performance_summary: '',
  success_count: '',
  forces_via: '',
  transfer_notes: '',
  home_recommendations: '',
  coach_message_parent: '',
  rpe: '5',
};

export default function CoachAthletePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [child, setChild] = useState<AssignedChild | null>(null);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
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

  // Créer le programme complet de 13 séances (1 par semaine)
  const createProgram = async () => {
    if (!user?.id || !child) return;
    setCreating(true);
    setError('');
    try {
      const group = (childAge(child.date_of_birth) ?? 10) <= 11 ? '8-11'
        : (childAge(child.date_of_birth) ?? 10) <= 14 ? '12-14' : '15-17';

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

  // Compléter une séance : bilan structuré -> session + report
  const submitReport = async (session: CoachSession) => {
    if (!user?.id || !child) return;
    setSaving(true);
    setError('');
    try {
      const { error: upErr } = await supabase
        .from('sessions')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          coach_notes: [
            form.performance_summary && `Résumé : ${form.performance_summary}`,
            form.coach_message_parent && `Message aux parents : ${form.coach_message_parent}`,
            form.home_recommendations && `À la maison : ${form.home_recommendations}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        })
        .eq('id', session.id);
      if (upErr) throw upErr;

      const { error: repErr } = await supabase.from('reports').insert({
        child_id: child.id,
        program_id: session.program_id,
        generated_by: user.id,
        content: {
          session_id: session.id,
          session_number: session.session_number,
          titre: session.title,
          résumé: form.performance_summary,
          réussites: form.success_count,
          'forces observées': form.forces_via,
          'transfert hors sport': form.transfer_notes,
          'recommandations maison': form.home_recommendations,
          'message du coach': form.coach_message_parent,
          rpe: form.rpe,
        },
      });
      if (repErr) throw repErr;

      setOpenForm(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'enregistrement du bilan");
    } finally {
      setSaving(false);
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

  return (
    <div className="max-w-4xl">
      <Link href="/coach/athletes" className="text-sm text-navy-600/70 hover:text-navy-900">
        ← Mes athlètes
      </Link>

      <div className="flex items-center gap-4 mt-4 mb-8">
        <span className="w-14 h-14 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl font-bold">
          {child.first_name[0]}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">
            {child.first_name} {child.last_name ?? ''}
          </h1>
          <p className="text-sm text-navy-600/70">
            {childAge(child.date_of_birth) ?? '–'} ans · {child.sport ?? 'Hockey'} ·{' '}
            {completed}/13 séances complétées
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>
      )}

      {sessions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white shadow-card text-center">
          <h2 className="font-display text-xl font-semibold text-navy-900 mb-2">
            Aucun programme en cours
          </h2>
          <p className="text-sm text-navy-600/70 mb-6">
            Créez le programme complet : 13 séances hebdomadaires selon le protocole THRIVE
            (Ancrer → Développer → Intégrer), que vous pourrez replanifier librement.
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
          {sessions.map((s) => {
            const isOpen = openForm === s.id;
            return (
              <div key={s.id} className="rounded-2xl bg-white shadow-card overflow-hidden">
                <div className="flex items-center gap-4 p-5">
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${
                      s.status === 'COMPLETED' ? 'bg-sage text-navy-900' : 'bg-navy-50 text-navy-600'
                    }`}
                  >
                    {s.session_number}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-navy-900 truncate">{s.title}</span>
                    <span className="block text-xs text-navy-600/60">
                      {s.scheduled_at &&
                        new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                          weekday: 'long', day: 'numeric', month: 'long',
                          hour: '2-digit', minute: '2-digit',
                        })}
                    </span>
                  </span>

                  {s.status === 'COMPLETED' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-sage text-navy-900">
                      Bilan envoyé ✓
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRescheduling(rescheduling === s.id ? null : s.id);
                          setOpenForm(null);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-navy-50 text-navy-700 hover:bg-navy-100"
                      >
                        Replanifier
                      </button>
                      <button
                        onClick={() => {
                          setOpenForm(isOpen ? null : s.id);
                          setRescheduling(null);
                          setForm(EMPTY_FORM);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-bold bg-sun text-navy-900 hover:bg-sun-dark"
                      >
                        {isOpen ? 'Fermer' : 'Compléter le bilan'}
                      </button>
                    </span>
                  )}
                </div>

                {rescheduling === s.id && (
                  <div className="px-5 pb-5 flex items-center gap-3 border-t border-navy-50 pt-4">
                    <input
                      type="datetime-local"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="border border-navy-100 rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => reschedule(s.id)}
                      className="px-4 py-2 rounded-full bg-navy-600 text-white text-xs font-bold"
                    >
                      Enregistrer la date
                    </button>
                  </div>
                )}

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-navy-50 pt-4 space-y-4">
                    <Field
                      label="Résumé de la séance"
                      hint="Ce qui a été travaillé, comment l'enfant a réagi"
                    >
                      <textarea
                        rows={3}
                        className="input-coach"
                        value={form.performance_summary}
                        onChange={(e) => setForm({ ...form, performance_summary: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Réussites (post-its verts)" hint="Nombre approximatif">
                        <input
                          type="number"
                          min={0}
                          className="input-coach"
                          value={form.success_count}
                          onChange={(e) => setForm({ ...form, success_count: e.target.value })}
                        />
                      </Field>
                      <Field label="RPE de l'enfant (0–10)">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          className="input-coach"
                          value={form.rpe}
                          onChange={(e) => setForm({ ...form, rpe: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Forces VIA observées" hint="Ex. : persévérance, curiosité, humour">
                      <input
                        className="input-coach"
                        value={form.forces_via}
                        onChange={(e) => setForm({ ...form, forces_via: e.target.value })}
                      />
                    </Field>
                    <Field label="Transfert hors sport" hint="Liens faits avec l'école, la maison…">
                      <textarea
                        rows={2}
                        className="input-coach"
                        value={form.transfer_notes}
                        onChange={(e) => setForm({ ...form, transfer_notes: e.target.value })}
                      />
                    </Field>
                    <Field label="Recommandations à la maison">
                      <textarea
                        rows={2}
                        className="input-coach"
                        value={form.home_recommendations}
                        onChange={(e) => setForm({ ...form, home_recommendations: e.target.value })}
                      />
                    </Field>
                    <Field label="Message aux parents" hint="2 à 4 phrases chaleureuses">
                      <textarea
                        rows={2}
                        className="input-coach"
                        value={form.coach_message_parent}
                        onChange={(e) => setForm({ ...form, coach_message_parent: e.target.value })}
                      />
                    </Field>
                    <div className="flex justify-end">
                      <button
                        onClick={() => submitReport(s)}
                        disabled={saving || !form.performance_summary}
                        className="px-6 py-2.5 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold disabled:opacity-50"
                      >
                        {saving ? 'Envoi…' : 'Terminer la séance et envoyer le bilan'}
                      </button>
                    </div>
                  </div>
                )}

                {s.status === 'COMPLETED' && s.coach_notes && (
                  <div className="px-5 pb-5 border-t border-navy-50 pt-3">
                    <p className="text-xs text-navy-600/70 whitespace-pre-line line-clamp-3">
                      {s.coach_notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .input-coach {
          width: 100%;
          border: 1px solid #cbe0ee;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #022539;
          background: #fff;
        }
        .input-coach:focus {
          outline: 2px solid #004e7a;
          outline-offset: 0;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-navy-600/50 mt-1">{hint}</span>}
    </label>
  );
}
