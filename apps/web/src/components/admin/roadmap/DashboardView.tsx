'use client';

import { useMemo } from 'react';
import {
  Task, TaskHistoryEntry, AdminProfile, Status, Category,
  STATUSES, CATEGORIES, PRIORITIES, fullName, fmtDate, fmtDateTime,
  describeHistory, isOverdue,
} from '@/lib/roadmap';

// ─────────────────────────────────────────────────────────────────────────────
// Tableau de bord géant : agrégation de TOUTES les tâches (les filtres globaux
// s'appliquent) — indicateurs, répartitions, échéances proches, retards,
// problèmes ouverts et flux d'activité temps réel de l'équipe.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  tasks: Task[];
  activity: TaskHistoryEntry[];
  admins: AdminProfile[];
  onOpen: (t: Task) => void;
};

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm px-4 py-3">
      <p className={`text-2xl font-bold ${accent ?? 'text-navy-900 dark:text-white'}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function Bar({ label, count, total, cls }: { label: string; count: number; total: number; cls: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-semibold">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DashboardView({ tasks, activity, admins, onOpen }: Props) {
  const adminById = useMemo(() => Object.fromEntries(admins.map((a) => [a.id, a])), [admins]);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(
      (Object.keys(STATUSES) as Status[]).map((s) => [s, tasks.filter((t) => t.status === s).length]),
    ) as Record<Status, number>;
    const overdue = tasks.filter(isOverdue);
    const problems = tasks.filter((t) => t.problem);
    const upcoming = tasks
      .filter((t) => t.deadline && t.status !== 'DONE' && !isOverdue(t))
      .filter((t) => (new Date(t.deadline! + 'T00:00:00').getTime() - Date.now()) / 86400000 <= 7)
      .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
    const donePct = tasks.length ? Math.round((byStatus.DONE / tasks.length) * 100) : 0;
    return { byStatus, overdue, problems, upcoming, donePct };
  }, [tasks]);

  const byCategory = useMemo(
    () =>
      (Object.keys(CATEGORIES) as Category[])
        .map((c) => ({ key: c, count: tasks.filter((t) => t.category === c).length }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count),
    [tasks],
  );

  const workload = useMemo(
    () =>
      admins
        .map((a) => ({
          admin: a,
          open: tasks.filter((t) => t.assignee === a.id && t.status !== 'DONE').length,
          done: tasks.filter((t) => t.completed_by === a.id).length,
        }))
        .filter((w) => w.open > 0 || w.done > 0),
    [admins, tasks],
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Tâches au total" value={tasks.length} />
        <Kpi label="En cours" value={stats.byStatus.IN_PROGRESS} accent="text-sun-dark" />
        <Kpi label="En révision" value={stats.byStatus.IN_REVIEW} accent="text-sky-600 dark:text-sky-400" />
        <Kpi label="Bloquées" value={stats.byStatus.BLOCKED} accent="text-red-600 dark:text-red-400" />
        <Kpi label="En retard" value={stats.overdue.length} accent="text-red-600 dark:text-red-400" />
        <Kpi label="Terminées" value={`${stats.donePct}%`} accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Problèmes ouverts — à régler par le Super Admin */}
          {stats.problems.length > 0 && (
            <section className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-5">
              <h2 className="font-bold text-red-700 dark:text-red-300 mb-3">
                ⚠ Problèmes à régler ({stats.problems.length})
              </h2>
              <ul className="space-y-2">
                {stats.problems.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => onOpen(t)}
                      className="w-full text-left rounded-xl bg-white dark:bg-white/5 px-4 py-3 hover:shadow transition-shadow"
                    >
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                      <p className="text-xs text-red-600 dark:text-red-300 mt-0.5 line-clamp-2">{t.problem}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Signalé par {fullName(adminById[t.problem_by ?? ''])}
                        {t.problem_at ? ` · ${fmtDateTime(t.problem_at)}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Échéances proches + retards */}
          <section className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm p-5">
            <h2 className="font-bold text-navy-900 dark:text-white mb-3">Échéances</h2>
            {stats.overdue.length === 0 && stats.upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">Rien d&apos;urgent à l&apos;horizon. ✨</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {[...stats.overdue, ...stats.upcoming].map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => onOpen(t)}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg px-2 -mx-2"
                    >
                      <span
                        className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg ${
                          isOverdue(t)
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {isOverdue(t) ? '⚠ ' : ''}{fmtDate(t.deadline)}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t.title}
                      </span>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORIES[t.category].chip}`}>
                        {CATEGORIES[t.category].label}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400 hidden md:block">
                        {t.assignee ? fullName(adminById[t.assignee]) : 'Non assignée'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Répartitions */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-navy-900 dark:text-white">Par groupe</h2>
              {byCategory.map(({ key, count }) => (
                <Bar key={key} label={CATEGORIES[key].label} count={count} total={tasks.length} cls={CATEGORIES[key].dot} />
              ))}
              {byCategory.length === 0 && <p className="text-sm text-slate-400">Aucune tâche.</p>}
            </section>
            <section className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm p-5 space-y-3">
              <h2 className="font-bold text-navy-900 dark:text-white">Charge de l&apos;équipe</h2>
              {workload.map(({ admin, open, done }) => (
                <div key={admin.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">
                    {fullName(admin)}{admin.role === 'SUPER_ADMIN' ? ' ★' : ''}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    <span className="font-bold text-navy-700 dark:text-sun">{open}</span> ouverte{open > 1 ? 's' : ''}
                    {' · '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{done}</span> complétée{done > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {workload.length === 0 && <p className="text-sm text-slate-400">Aucune attribution.</p>}
            </section>
          </div>
        </div>

        {/* Flux d'activité live */}
        <section className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/10 shadow-sm p-5">
          <h2 className="font-bold text-navy-900 dark:text-white mb-3">
            Activité de l&apos;équipe
            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
          </h2>
          <ul className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {activity.map((h) => (
              <li key={h.id} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fullName(adminById[h.actor ?? ''])}
                </span>{' '}
                {describeHistory(h, adminById)}
                <span className="block text-[10px] text-slate-400/80">
                  {h.task_title} · {fmtDateTime(h.created_at)}
                </span>
              </li>
            ))}
            {activity.length === 0 && <li className="text-sm text-slate-400">Aucune action récente.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
