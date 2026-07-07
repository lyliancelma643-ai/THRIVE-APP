'use client';

import { useMemo, useState } from 'react';
import { Task, PRIORITIES, CATEGORIES, STATUSES, isOverdue } from '@/lib/roadmap';

// ─────────────────────────────────────────────────────────────────────────────
// Vue calendrier : grille mensuelle, tâches placées sur leur échéance,
// colorées par priorité (les filtres globaux s'appliquent en amont).
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-500', MEDIUM: 'bg-amber-400', LOW: 'bg-slate-300 dark:bg-slate-500',
};

export function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { cells, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // Lundi = début de semaine
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startOffset; i++) list.push({ date: null, key: `pad-${i}` });
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ date: new Date(year, month, d), key: `d-${d}` });
    }
    return {
      cells: list,
      monthLabel: cursor.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }),
    };
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      map.set(t.deadline, [...(map.get(t.deadline) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const noDeadline = tasks.filter((t) => !t.deadline);
  const todayKey = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local

  const dayKey = (d: Date) => d.toLocaleDateString('sv-SE');

  return (
    <div className="space-y-4">
      {/* Navigation mois */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <h2 className="font-bold text-navy-900 dark:text-white capitalize">{monthLabel}</h2>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          aria-label="Mois suivant"
        >
          →
        </button>
      </div>

      {/* Grille */}
      <div className="bg-white dark:bg-white/[0.04] rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/10">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, key }) => {
            const k = date ? dayKey(date) : '';
            const dayTasks = date ? byDay.get(k) ?? [] : [];
            const isToday = k === todayKey;
            return (
              <div
                key={key}
                className={`min-h-[92px] border-b border-r border-slate-50 dark:border-white/5 p-1.5 ${
                  date ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'
                }`}
              >
                {date && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold rounded-full ${
                        isToday ? 'bg-sun text-navy-900' : 'text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-0.5 space-y-1">
                      {dayTasks.slice(0, 3).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => onOpen(t)}
                          title={`${t.title} · ${STATUSES[t.status].label} · ${PRIORITIES[t.priority].label}`}
                          className={`w-full flex items-center gap-1 rounded-md px-1.5 py-1 text-left text-[10px] font-medium truncate transition-colors ${
                            t.status === 'DONE'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 line-through'
                              : isOverdue(t)
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <button
                          onClick={() => onOpen(dayTasks[3])}
                          className="w-full text-left text-[10px] text-slate-400 px-1.5"
                        >
                          +{dayTasks.length - 3} autre{dayTasks.length - 3 > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sans échéance */}
      {noDeadline.length > 0 && (
        <div className="bg-white dark:bg-white/[0.04] rounded-2xl shadow-sm border border-slate-100 dark:border-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
            Sans échéance ({noDeadline.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {noDeadline.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpen(t)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORIES[t.category].chip} hover:opacity-80`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
