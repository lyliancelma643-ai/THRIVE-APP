'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import {
  Task, TaskHistoryEntry, AdminProfile, Horizon, Status, Priority, Category,
  HORIZONS, STATUSES, PRIORITIES, CATEGORIES,
  fullName, fmtDate, describeHistory, isOverdue, horizonFromDeadline,
  fetchTasks, fetchAdmins, fetchActivity,
} from '@/lib/roadmap';
import { TaskDetail } from '@/components/admin/roadmap/TaskDetail';
import { CalendarView } from '@/components/admin/roadmap/CalendarView';
import { DashboardView } from '@/components/admin/roadmap/DashboardView';
import { ChatPanel } from '@/components/admin/roadmap/ChatPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap interne v2 — trois vues :
//   · Organisation : colonnes par horizon (classement AUTO selon la deadline),
//     regroupement visuel par groupe, priorités, ajout rapide. Les tâches
//     cochées finies quittent les colonnes et se rangent dans la section
//     repliable « Terminées » en bas (décocher = rouvrir).
//   · Calendrier : grille mensuelle triée, mêmes filtres.
//   · Vue d'ensemble : tableau de bord géant (KPIs, retards, problèmes,
//     charge d'équipe, flux d'activité live).
// Filtres avancés (statut, priorité, assigné, groupe, recherche) + mode sombre
// + chat d'équipe + synchronisation temps réel Supabase.
// Droits : Super Admin = contrôle total (RLS + triggers, migration 037).
// ─────────────────────────────────────────────────────────────────────────────

type View = 'BOARD' | 'CALENDAR' | 'DASHBOARD';

const selectCls =
  'text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] ' +
  'text-slate-600 dark:text-slate-200 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300';

export default function AdminRoadmapPage() {
  const { user } = useAuthStore();
  const me = user?.id ?? '';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [activity, setActivity] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>('BOARD');
  const [dark, setDark] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  // Bannière « changements récents » : curseur « vu jusqu'à » global
  // (admin_activity_seen, migration 049) + rejets ligne par ligne
  // (admin_activity_dismissed, migration 050). Persistés en base → cross-appareils.
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [seenReady, setSeenReady] = useState(false);

  // Filtres avancés
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState<Status | 'ALL'>('ALL');
  const [fPriority, setFPriority] = useState<Priority | 'ALL'>('ALL');
  const [fAssignee, setFAssignee] = useState<string>('ALL');
  const [fCategory, setFCategory] = useState<Category | 'ALL'>('ALL');
  const [showDone, setShowDone] = useState(true);

  // Ajout rapide
  const [draft, setDraft] = useState({
    title: '', deadline: '', category: 'GENERAL' as Category, priority: 'MEDIUM' as Priority,
  });

  // Mode sombre mémorisé
  useEffect(() => {
    setDark(typeof window !== 'undefined' && window.localStorage.getItem('thrive-roadmap-dark') === '1');
  }, []);
  const toggleDark = () => {
    setDark((d) => {
      try { window.localStorage.setItem('thrive-roadmap-dark', d ? '0' : '1'); } catch { /* ok */ }
      return !d;
    });
  };

  const load = useCallback(async () => {
    try {
      const [t, a, act] = await Promise.all([fetchTasks(), fetchAdmins(), fetchActivity()]);
      setTasks(t);
      setAdmins(a);
      setActivity(act);
    } catch {
      setError('Chargement impossible — vérifie que la migration 037 est appliquée.');
    }
    setLoading(false);
  }, []);

  // Curseur global + rejets individuels : chargés une fois la session connue
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    Promise.all([
      supabase.from('admin_activity_seen').select('seen_at').eq('user_id', me).maybeSingle(),
      supabase.from('admin_activity_dismissed').select('history_id').eq('user_id', me),
    ]).then(([seen, dism]) => {
      if (cancelled) return;
      setSeenAt(seen.data?.seen_at ?? null);
      setDismissedIds(new Set((dism.data ?? []).map((d) => d.history_id as string)));
      setSeenReady(true);
    }, () => { if (!cancelled) setSeenReady(true); });
    return () => { cancelled = true; };
  }, [me]);

  // Chargement + temps réel (tâches, historique) + rappel d'échéances
  useEffect(() => {
    load();
    supabase.rpc('notify_admin_task_deadlines').then(() => {}, () => {});
    const channel = supabase
      .channel('admin-roadmap-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_tasks' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_task_history' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // ── Mutations (optimistes, la RLS/le trigger tranchent) ──
  const patch = useCallback(async (id: string, fields: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    const { error: err } = await supabase.from('admin_tasks').update(fields).eq('id', id);
    if (err) setError(err.message);
    await load();
    if (err) throw new Error(err.message);
  }, [load]);

  const removeTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error: err } = await supabase.from('admin_tasks').delete().eq('id', id);
    if (err) setError(err.message);
    await load();
  }, [load]);

  const createTask = async () => {
    if (!draft.title.trim()) return;
    const { error: err } = await supabase.from('admin_tasks').insert({
      title: draft.title.trim(),
      deadline: draft.deadline || null,
      category: draft.category,
      priority: draft.priority,
      horizon: horizonFromDeadline(draft.deadline || null, 'WEEK'),
      created_by: me,
    });
    if (err) setError(err.message);
    setDraft({ title: '', deadline: '', category: 'GENERAL', priority: 'MEDIUM' });
    await load();
  };

  // ── Filtres ──
  // `filtered` : tâches visibles dans les vues (le filtre « Terminées » s'applique
  // au calendrier et à la vue d'ensemble). `doneTasks` : tâches finies pour la
  // section « Terminées » de la vue Organisation — mêmes filtres, sauf showDone.
  const { filtered, doneTasks } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = (t: Task) => {
      if (fStatus !== 'ALL' && t.status !== fStatus) return false;
      if (fPriority !== 'ALL' && t.priority !== fPriority) return false;
      if (fCategory !== 'ALL' && t.category !== fCategory) return false;
      if (fAssignee === 'NONE' && t.assignee !== null) return false;
      if (fAssignee !== 'ALL' && fAssignee !== 'NONE' && t.assignee !== fAssignee) return false;
      if (needle && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    };
    const visible = tasks.filter(matches);
    return {
      filtered: visible.filter((t) => showDone || t.status !== 'DONE'),
      doneTasks: visible
        .filter((t) => t.status === 'DONE')
        .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at)),
    };
  }, [tasks, q, fStatus, fPriority, fCategory, fAssignee, showDone]);

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null;
  const adminById = useMemo(() => Object.fromEntries(admins.map((a) => [a.id, a])), [admins]);
  const problemCount = tasks.filter((t) => t.problem).length;
  const myOpenCount = tasks.filter((t) => t.assignee === me && t.status !== 'DONE').length;
  const mineOnly = fAssignee === me;

  // ── Changements non vus (faits par les AUTRES, au-dessus du curseur global,
  //    et pas rejetés un par un) ──
  const unseen = useMemo(() => {
    if (!seenReady || !me) return [];
    return activity.filter(
      (h) => h.actor !== me && (!seenAt || h.created_at > seenAt) && !dismissedIds.has(h.id),
    );
  }, [activity, seenAt, dismissedIds, seenReady, me]);

  // « Vu » global : avance le curseur au changement le plus récent (efface tout)
  // et purge les rejets individuels devenus inutiles (déjà sous le curseur).
  const markAllSeen = async () => {
    const latest = activity[0]?.created_at;
    if (!latest || !me) return;
    setSeenAt(latest);
    setDismissedIds(new Set());
    const { error: err } = await supabase
      .from('admin_activity_seen')
      .upsert({ user_id: me, seen_at: latest });
    if (err) setError(err.message);
    else await supabase.from('admin_activity_dismissed').delete().eq('user_id', me);
  };

  // « Vu » d'une ligne : masque seulement ce changement pour moi.
  const dismissOne = async (historyId: string) => {
    if (!me) return;
    setDismissedIds((prev) => new Set(prev).add(historyId));
    const { error: err } = await supabase
      .from('admin_activity_dismissed')
      .upsert({ user_id: me, history_id: historyId });
    if (err) setError(err.message);
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <div className={`space-y-5 rounded-3xl transition-colors ${dark ? 'bg-[#0a1622] -m-4 p-4 md:-m-6 md:p-6 min-h-screen' : ''}`}>
        {/* ── Case rouge : tout changement fait par les autres depuis mon dernier « Vu » ── */}
        {unseen.length > 0 && (
          <div
            role="status"
            className="rounded-2xl bg-red-50 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/40 shadow-sm px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">
                🔔 {unseen.length} changement{unseen.length > 1 ? 's' : ''} depuis ton dernier passage
              </p>
              <button
                onClick={markAllSeen}
                title="Tout marquer comme vu et vider la case"
                className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                ✓ Tout vu
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {unseen.slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center gap-1.5">
                  <button
                    onClick={() => h.task_id && tasks.some((t) => t.id === h.task_id) && setOpenTaskId(h.task_id)}
                    className="flex-1 min-w-0 text-left text-xs text-red-800 dark:text-red-200 rounded-lg px-2 py-1 hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors"
                  >
                    <span className="font-semibold">{fullName(adminById[h.actor ?? ''])}</span>{' '}
                    {describeHistory(h, adminById)}
                    <span className="text-red-400 dark:text-red-300/60"> · « {h.task_title} » · {fmtDate(h.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </button>
                  <button
                    onClick={() => dismissOne(h.id)}
                    title="Marquer ce changement comme vu"
                    aria-label="Marquer ce changement comme vu"
                    className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors"
                  >
                    ✓ Vu
                  </button>
                </li>
              ))}
              {unseen.length > 8 && (
                <li className="text-[11px] text-red-500 dark:text-red-300/70 px-2">
                  + {unseen.length - 8} autre{unseen.length - 8 > 1 ? 's' : ''} changement{unseen.length - 8 > 1 ? 's' : ''}…
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ── En-tête : vues, chat, mode sombre ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Roadmap interne</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {isSuperAdmin
                ? 'Contrôle total : attribution, édition, suppression, résolution des problèmes.'
                : 'Prends une tâche libre, avance-la, signale un problème si tu bloques.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sélecteur de vue */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-white/10 p-1">
              {([
                { key: 'BOARD', label: 'Organisation' },
                { key: 'CALENDAR', label: 'Calendrier' },
                { key: 'DASHBOARD', label: "Vue d'ensemble" },
              ] as { key: View; label: string }[]).map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors ${
                    view === v.key
                      ? 'bg-white dark:bg-navy-600 text-navy-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-700'
                  }`}
                >
                  {v.label}
                  {v.key === 'DASHBOARD' && problemCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px]">
                      {problemCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              💬 Chat
            </button>
            <button
              onClick={toggleDark}
              aria-label={dark ? 'Mode clair' : 'Mode sombre'}
              title={dark ? 'Mode clair' : 'Mode sombre (confort visuel)'}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-sun hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              {dark ? '☀︎' : '☾'}
            </button>
          </div>
        </div>

        {/* ── Filtres avancés ── */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm px-3 py-2.5">
          {/* « Mes tâches » : bascule le filtre assigné sur moi / tous */}
          <button
            type="button"
            onClick={() => setFAssignee(mineOnly ? 'ALL' : me)}
            aria-pressed={mineOnly}
            title={mineOnly ? 'Réafficher toutes les tâches' : "N'afficher que les tâches qui me sont assignées"}
            className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors ${
              mineOnly
                ? 'bg-navy-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20'
            }`}
          >
            👤 Mes tâches
            {myOpenCount > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] ${
                mineOnly ? 'bg-white/25 text-white' : 'bg-navy-600 text-white'
              }`}>
                {myOpenCount}
              </span>
            )}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Rechercher…"
            className={selectCls + ' flex-1 min-w-[140px]'}
          />
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as Status | 'ALL')} className={selectCls} aria-label="Filtrer par statut">
            <option value="ALL">Statut : tous</option>
            {(Object.keys(STATUSES) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUSES[s].label}</option>
            ))}
          </select>
          <select value={fPriority} onChange={(e) => setFPriority(e.target.value as Priority | 'ALL')} className={selectCls} aria-label="Filtrer par priorité">
            <option value="ALL">Priorité : toutes</option>
            {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITIES[p].label}</option>
            ))}
          </select>
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value as Category | 'ALL')} className={selectCls} aria-label="Filtrer par groupe">
            <option value="ALL">Groupe : tous</option>
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORIES[c].label}</option>
            ))}
          </select>
          <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className={selectCls} aria-label="Filtrer par assigné">
            <option value="ALL">Assigné : tous</option>
            <option value="NONE">Non assignées</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{fullName(a)}{a.id === me ? ' (moi)' : ''}</option>
            ))}
          </select>
          {/* En vue Organisation, la section « Terminées » remplace ce filtre */}
          {view !== 'BOARD' && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300 select-none cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="w-4 h-4 rounded accent-navy-600"
              />
              Terminées
            </label>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm px-4 py-3 flex justify-between items-center gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold" aria-label="Fermer l'erreur">✕</button>
          </div>
        )}

        {/* ── Ajout rapide (toutes vues) ── */}
        <form
          onSubmit={(e) => { e.preventDefault(); createTask(); }}
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm px-3 py-2.5"
        >
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="＋ Nouvel objectif ou tâche…"
            className={selectCls + ' flex-1 min-w-[180px] !text-sm'}
          />
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })} className={selectCls} aria-label="Groupe">
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
              <option key={c} value={c}>{CATEGORIES[c].label}</option>
            ))}
          </select>
          <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })} className={selectCls} aria-label="Priorité">
            {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITIES[p].label}</option>
            ))}
          </select>
          <input
            type="date"
            value={draft.deadline}
            onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            aria-label="Échéance (classement automatique)"
            title="La date classe automatiquement la tâche : semaine / mois / 3 mois / année"
            className={selectCls}
          />
          <button
            type="submit"
            disabled={!draft.title.trim()}
            className="px-4 py-2 rounded-lg bg-navy-600 text-white text-sm font-bold hover:bg-navy-700 disabled:opacity-40 transition-colors"
          >
            Ajouter
          </button>
        </form>

        {/* ── Contenu selon la vue ── */}
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : view === 'CALENDAR' ? (
          <CalendarView tasks={filtered} onOpen={(t) => setOpenTaskId(t.id)} />
        ) : view === 'DASHBOARD' ? (
          <DashboardView tasks={filtered} activity={activity} admins={admins} onOpen={(t) => setOpenTaskId(t.id)} />
        ) : (
          /* ── Vue Organisation : colonnes par horizon (classement auto) ──
             Les tâches finies quittent les colonnes → section « Terminées » en bas. */
          <>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {HORIZONS.map((h) => {
              const list = filtered
                .filter((t) => t.horizon === h.key && t.status !== 'DONE')
                .sort((a, b) =>
                  PRIORITIES[a.priority].weight - PRIORITIES[b.priority].weight
                  || (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
              const total = tasks.filter((t) => t.horizon === h.key).length;
              const done = tasks.filter((t) => t.horizon === h.key && t.status === 'DONE').length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <section
                  key={h.key}
                  className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm"
                >
                  <div className="px-4 pt-4">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-bold text-navy-900 dark:text-white">{h.label}</h2>
                      <span className="text-[11px] text-slate-400">{done}/{total}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{h.hint} · classement automatique par date</p>
                    <div className="mt-2.5 h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-navy-500 dark:bg-sun transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ul className="p-2.5 space-y-1.5">
                    {list.length === 0 && (
                      <li className="px-2 py-4 text-sm text-slate-400 text-center">—</li>
                    )}
                    {list.map((t) => {
                      const canToggle = isSuperAdmin || t.assignee === me;
                      return (
                        <li key={t.id}>
                          <div
                            className={`group rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-white/15 hover:shadow-sm transition-all px-2.5 py-2 ${
                              t.problem ? 'bg-red-50/60 dark:bg-red-500/[0.07]' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                aria-label={`Terminer « ${t.title} »`}
                                checked={t.status === 'DONE'}
                                disabled={!canToggle}
                                onChange={(e) =>
                                  patch(t.id, { status: e.target.checked ? 'DONE' : 'TODO' }).catch(() => {})
                                }
                                className="mt-0.5 w-[17px] h-[17px] rounded accent-navy-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setOpenTaskId(t.id)}
                                onKeyDown={(e) => e.key === 'Enter' && setOpenTaskId(t.id)}
                                className="flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                                  {t.problem && <span title="Problème signalé">⚠ </span>}
                                  {t.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORIES[t.category].chip}`}>
                                    {CATEGORIES[t.category].label}
                                  </span>
                                  {t.priority !== 'MEDIUM' && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITIES[t.priority].chip}`}>
                                      {t.priority === 'HIGH' ? '↑ haute' : '↓ basse'}
                                    </span>
                                  )}
                                  {t.status !== 'TODO' && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUSES[t.status].chip}`}>
                                      {STATUSES[t.status].label}
                                    </span>
                                  )}
                                  {t.deadline && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                      isOverdue(t)
                                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                        : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                                    }`}>
                                      {isOverdue(t) ? '⚠ ' : ''}{fmtDate(t.deadline)}
                                    </span>
                                  )}
                                  {t.assignee ? (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-navy-50 text-navy-700 dark:bg-navy-500/25 dark:text-navy-100">
                                      {fullName(adminById[t.assignee])}{t.assignee === me ? ' (moi)' : ''}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        patch(t.id, { assignee: me, status: 'IN_PROGRESS' }).catch(() => {});
                                      }}
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sun text-navy-900 hover:bg-sun-dark"
                                    >
                                      Je m&apos;en occupe
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* ── Section « Terminées » : les tâches cochées finies se rangent ici ── */}
          {doneTasks.length > 0 && (
            <section className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/[0.06] border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <button
                onClick={() => setDoneOpen((o) => !o)}
                aria-expanded={doneOpen}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <h2 className="font-bold text-emerald-700 dark:text-emerald-300">
                  ✅ Terminées
                  <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] align-middle">
                    {doneTasks.length}
                  </span>
                </h2>
                <span className="shrink-0 text-xs font-semibold text-emerald-600/80 dark:text-emerald-300/80">
                  {doneOpen ? 'Replier ▲' : 'Afficher ▼'}
                </span>
              </button>
              {doneOpen && (
                <ul className="px-2.5 pb-2.5 grid md:grid-cols-2 gap-1.5">
                  {doneTasks.map((t) => {
                    const canToggle = isSuperAdmin || t.assignee === me;
                    return (
                      <li key={t.id}>
                        <div className="flex items-start gap-2.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/25 hover:shadow-sm transition-all px-2.5 py-2">
                          <input
                            type="checkbox"
                            checked
                            disabled={!canToggle}
                            aria-label={`Rouvrir « ${t.title} »`}
                            title="Décocher pour rouvrir la tâche"
                            onChange={() => patch(t.id, { status: 'TODO' }).catch(() => {})}
                            className="mt-0.5 w-[17px] h-[17px] rounded accent-emerald-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setOpenTaskId(t.id)}
                            onKeyDown={(e) => e.key === 'Enter' && setOpenTaskId(t.id)}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 leading-snug line-through decoration-emerald-400/70">
                              {t.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORIES[t.category].chip}`}>
                                {CATEGORIES[t.category].label}
                              </span>
                              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                                Terminée{t.completed_by ? ` par ${fullName(adminById[t.completed_by])}${t.completed_by === me ? ' (moi)' : ''}` : ''}
                                {' · '}
                                {fmtDate(t.completed_at ?? t.updated_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
          </>
        )}

        {/* ── Détail de tâche ── */}
        {openTask && (
          <TaskDetail
            task={openTask}
            admins={admins}
            me={me}
            isSuperAdmin={isSuperAdmin}
            dark={dark}
            onPatch={patch}
            onDelete={removeTask}
            onClose={() => setOpenTaskId(null)}
          />
        )}

        {/* ── Chat d'équipe ── */}
        {chatOpen && <ChatPanel me={me} admins={admins} dark={dark} onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  );
}
