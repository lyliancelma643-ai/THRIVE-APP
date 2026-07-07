'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap interne — visible uniquement des Admins & Super Admins.
// Objectifs et tâches répartis sur 4 horizons (semaine / mois / 3 mois / année)
// avec cases à cocher, deadlines, attribution et « Je m'en occupe ».
//
// Droits (miroir exact de la RLS, migration 035) :
//   · SUPER ADMIN : tout — édite/supprime/réassigne n'importe quelle tâche.
//   · ADMIN      : crée ; édite ses tâches, celles qui lui sont assignées ou
//                  non assignées (self-assign) ; supprime ses propres tâches.
// Synchronisation temps réel entre les administrateurs (Supabase Realtime).
// ─────────────────────────────────────────────────────────────────────────────

type Horizon = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

type Task = {
  id: string;
  title: string;
  description: string | null;
  horizon: Horizon;
  status: Status;
  deadline: string | null;
  assignee: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type AdminProfile = { id: string; first_name: string | null; last_name: string | null; role: string };

const HORIZONS: { key: Horizon; label: string; hint: string; accent: string }[] = [
  { key: 'WEEK', label: 'Cette semaine', hint: 'Actions immédiates', accent: 'bg-sun' },
  { key: 'MONTH', label: 'Ce mois-ci', hint: 'Chantiers en cours', accent: 'bg-navy-400' },
  { key: 'QUARTER', label: '3 mois', hint: 'Objectifs de trimestre', accent: 'bg-sage-dark' },
  { key: 'YEAR', label: 'Année', hint: 'Vision long terme', accent: 'bg-navy-700' },
];

function nameOf(p?: AdminProfile) {
  if (!p) return '—';
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sans nom';
}

function isOverdue(t: Task) {
  return !!t.deadline && t.status !== 'DONE' && new Date(t.deadline + 'T23:59:59') < new Date();
}

export default function AdminRoadmapPage() {
  const { user } = useAuthStore();
  const me = user?.id ?? '';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(true);
  // Formulaire de création par horizon
  const [draft, setDraft] = useState<Record<Horizon, { title: string; deadline: string }>>({
    WEEK: { title: '', deadline: '' },
    MONTH: { title: '', deadline: '' },
    QUARTER: { title: '', deadline: '' },
    YEAR: { title: '', deadline: '' },
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const adminById = useMemo(
    () => Object.fromEntries(admins.map((a) => [a.id, a])),
    [admins],
  );

  // Ce que l'utilisateur courant a le droit de modifier (miroir de la RLS)
  const canEdit = useCallback(
    (t: Task) =>
      isSuperAdmin || t.created_by === me || t.assignee === me || t.assignee === null,
    [isSuperAdmin, me],
  );
  const canDelete = useCallback(
    (t: Task) => isSuperAdmin || t.created_by === me,
    [isSuperAdmin, me],
  );

  const load = useCallback(async () => {
    const [tasksRes, adminsRes] = await Promise.all([
      supabase
        .from('admin_tasks')
        .select('*')
        .order('deadline', { ascending: true, nullsFirst: false })
        .order('created_at'),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('role', ['ADMIN', 'SUPER_ADMIN'])
        .eq('is_active', true)
        .order('first_name'),
    ]);
    if (tasksRes.error) {
      setError('Roadmap indisponible — la migration 035 doit être appliquée.');
      setLoading(false);
      return;
    }
    setTasks((tasksRes.data ?? []) as Task[]);
    setAdmins((adminsRes.data ?? []) as AdminProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Sync temps réel entre administrateurs
    const channel = supabase
      .channel('admin-roadmap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // ── Mutations (optimistes, puis re-sync) ──
  const patch = async (id: string, fields: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    const { error: err } = await supabase.from('admin_tasks').update(fields).eq('id', id);
    if (err) setError(err.message);
    await load();
  };

  const createTask = async (horizon: Horizon) => {
    const d = draft[horizon];
    if (!d.title.trim()) return;
    const { error: err } = await supabase.from('admin_tasks').insert({
      title: d.title.trim(),
      horizon,
      deadline: d.deadline || null,
      created_by: me,
    });
    if (err) setError(err.message);
    setDraft((prev) => ({ ...prev, [horizon]: { title: '', deadline: '' } }));
    await load();
  };

  const removeTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error: err } = await supabase.from('admin_tasks').delete().eq('id', id);
    if (err) setError(err.message);
    await load();
  };

  const globalDone = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="space-y-6">
      {/* En-tête + progression globale */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Roadmap interne</h1>
          <p className="text-slate-500 text-sm mt-1">
            Objectifs de l&apos;équipe — visibles des admins uniquement.
            {isSuperAdmin ? ' Vous pouvez tout modifier et attribuer les tâches.' : ' Prenez une tâche libre avec « Je m’en occupe ».'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="w-4 h-4 rounded accent-navy-600"
            />
            Afficher les tâches terminées
          </label>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-navy-50 text-navy-700">
            {globalDone}/{tasks.length} terminées
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {HORIZONS.map((h) => {
            const list = tasks.filter(
              (t) => t.horizon === h.key && (showDone || t.status !== 'DONE'),
            );
            const total = tasks.filter((t) => t.horizon === h.key).length;
            const done = tasks.filter((t) => t.horizon === h.key && t.status === 'DONE').length;
            const pct = total ? Math.round((done / total) * 100) : 0;

            return (
              <section
                key={h.key}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                {/* En-tête d'horizon + barre de progression */}
                <div className="px-5 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-navy-900">{h.label}</h2>
                      <p className="text-xs text-slate-400">{h.hint}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.accent} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Tâches */}
                <ul className="px-2 py-3">
                  {list.length === 0 && (
                    <li className="px-3 py-4 text-sm text-slate-400">
                      Rien ici pour l&apos;instant.
                    </li>
                  )}
                  {list.map((t) => {
                    const editable = canEdit(t);
                    const assignee = t.assignee ? adminById[t.assignee] : undefined;
                    const overdue = isOverdue(t);
                    const isExpanded = expanded === t.id;
                    return (
                      <li
                        key={t.id}
                        className={`group rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                          t.status === 'DONE' ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Case à cocher (TODO/DONE) */}
                          <input
                            type="checkbox"
                            aria-label={`Terminer « ${t.title} »`}
                            checked={t.status === 'DONE'}
                            disabled={!editable}
                            onChange={(e) =>
                              patch(t.id, { status: e.target.checked ? 'DONE' : 'TODO' })
                            }
                            className="mt-1 w-[18px] h-[18px] rounded accent-navy-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          />

                          <div className="flex-1 min-w-0">
                            <button
                              className="text-left w-full"
                              onClick={() => setExpanded(isExpanded ? null : t.id)}
                            >
                              <p
                                className={`text-sm font-semibold text-slate-800 ${
                                  t.status === 'DONE' ? 'line-through' : ''
                                }`}
                              >
                                {t.title}
                              </p>
                            </button>

                            {/* Métadonnées : deadline, statut, assigné */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {t.deadline && (
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                    overdue
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {overdue ? '⚠ ' : '📅 '}
                                  {new Date(t.deadline + 'T00:00:00').toLocaleDateString('fr-CA', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              )}
                              {t.status === 'IN_PROGRESS' && (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sun/60 text-navy-900">
                                  En cours
                                </span>
                              )}
                              {isSuperAdmin ? (
                                // Contrôle total Super Admin : attribution/retrait
                                // directement sur la ligne, sans déplier la tâche
                                <select
                                  value={t.assignee ?? ''}
                                  onChange={(e) => patch(t.id, { assignee: e.target.value || null })}
                                  aria-label={`Attribuer « ${t.title} »`}
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-navy-300 ${
                                    t.assignee
                                      ? 'bg-navy-50 text-navy-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  <option value="">Non assignée</option>
                                  {admins.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {nameOf(a)}
                                      {a.role === 'SUPER_ADMIN' ? ' ★' : ''}
                                      {a.id === me ? ' (moi)' : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : assignee ? (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">
                                  {nameOf(assignee)}
                                  {t.assignee === me ? ' (moi)' : ''}
                                </span>
                              ) : (
                                t.status !== 'DONE' && (
                                  <button
                                    onClick={() => patch(t.id, { assignee: me, status: 'IN_PROGRESS' })}
                                    className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sun text-navy-900 hover:bg-sun-dark transition-colors"
                                  >
                                    Je m&apos;en occupe
                                  </button>
                                )
                              )}
                            </div>

                            {/* Détail replié : titre, description + actions avancées */}
                            {isExpanded && (
                              <div className="mt-2 space-y-2">
                                {editable && (
                                  <input
                                    defaultValue={t.title}
                                    aria-label="Titre de la tâche"
                                    onBlur={(e) => {
                                      const v = e.target.value.trim();
                                      if (v && v !== t.title) patch(t.id, { title: v });
                                    }}
                                    className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
                                  />
                                )}
                                {editable ? (
                                  <textarea
                                    defaultValue={t.description ?? ''}
                                    placeholder="Ajouter une note, un contexte, des critères de done…"
                                    rows={2}
                                    onBlur={(e) => {
                                      const v = e.target.value.trim() || null;
                                      if (v !== t.description) patch(t.id, { description: v });
                                    }}
                                    className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
                                  />
                                ) : (
                                  t.description && (
                                    <p className="text-sm text-slate-500">{t.description}</p>
                                  )
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                  {editable && (
                                    <>
                                      <input
                                        type="date"
                                        value={t.deadline ?? ''}
                                        onChange={(e) =>
                                          patch(t.id, { deadline: e.target.value || null })
                                        }
                                        aria-label="Deadline"
                                        className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600"
                                      />
                                      {t.status !== 'DONE' && (
                                        <button
                                          onClick={() =>
                                            patch(t.id, {
                                              status:
                                                t.status === 'IN_PROGRESS' ? 'TODO' : 'IN_PROGRESS',
                                            })
                                          }
                                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                        >
                                          {t.status === 'IN_PROGRESS' ? '↩ À faire' : '▶ En cours'}
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {/* Attribution : Super Admin assigne qui il veut */}
                                  {/* Déplacer la tâche vers un autre horizon */}
                                  {editable && (
                                    <select
                                      value={t.horizon}
                                      onChange={(e) =>
                                        patch(t.id, { horizon: e.target.value as Horizon })
                                      }
                                      aria-label="Horizon"
                                      className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 bg-white"
                                    >
                                      {HORIZONS.map((opt) => (
                                        <option key={opt.key} value={opt.key}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  {canDelete(t) && (
                                    <button
                                      onClick={() => removeTask(t.id)}
                                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 ml-auto"
                                    >
                                      Supprimer
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Créée par {nameOf(adminById[t.created_by])} ·{' '}
                                  {new Date(t.created_at).toLocaleDateString('fr-CA')}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Ajout rapide */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createTask(h.key);
                  }}
                  className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50/60"
                >
                  <input
                    value={draft[h.key].title}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [h.key]: { ...prev[h.key], title: e.target.value },
                      }))
                    }
                    placeholder="Nouvel objectif…"
                    className="flex-1 min-w-0 text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
                  />
                  <input
                    type="date"
                    value={draft[h.key].deadline}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [h.key]: { ...prev[h.key], deadline: e.target.value },
                      }))
                    }
                    aria-label="Deadline (optionnelle)"
                    className="text-xs rounded-lg border border-slate-200 px-2 py-2 text-slate-600 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!draft[h.key].title.trim()}
                    className="shrink-0 px-3 py-2 rounded-lg bg-navy-600 text-white text-sm font-bold hover:bg-navy-700 disabled:opacity-40 transition-colors"
                  >
                    +
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
