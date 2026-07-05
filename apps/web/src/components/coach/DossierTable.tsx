'use client';

// Tableau de suivi des dossiers — vue coach / admin / super admin (le filtrage
// par rôle est fait côté SQL par list_dossiers()). Alertes visuelles sur les
// dossiers incomplets. Utilisé tel quel par les 3 portails.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { DossierRow, fetchDossiers } from '@/lib/bilan';
import { CompletenessBar } from './DossierCompleteness';

function pctTone(pct: number) {
  if (pct >= 100) return 'text-emerald-700 bg-emerald-50';
  if (pct >= 60) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export function DossierTable({
  basePath,
  showAdmin = false,
}: {
  basePath: string; // ex: /coach/athletes ou /admin/dossiers
  showAdmin?: boolean;
}) {
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all');

  const load = useCallback(async () => {
    setRows(await fetchDossiers());
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Réagit aux changements live (statut séance, nouveau document, LSSS complété…)
  useEffect(() => {
    const ch = supabase
      .channel('dossiers-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athlete_identity' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questionnaires' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const incomplete = useMemo(() => rows.filter((r) => r.pct < 100), [rows]);
  const shown = filter === 'incomplete' ? incomplete : rows;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-full bg-navy-50 text-navy-700 font-semibold">
            {rows.length} dossier{rows.length > 1 ? 's' : ''}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-semibold">
            {incomplete.length} incomplet{incomplete.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="ml-auto flex rounded-full bg-gray-100 p-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full cursor-pointer ${filter === 'all' ? 'bg-white shadow font-semibold' : 'text-gray-500'}`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('incomplete')}
            className={`px-3 py-1.5 rounded-full cursor-pointer ${filter === 'incomplete' ? 'bg-white shadow font-semibold' : 'text-gray-500'}`}
          >
            À compléter
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 p-6 rounded-2xl bg-white border border-gray-100">
          {filter === 'incomplete' ? 'Tous les dossiers sont complets 🎉' : 'Aucun dossier.'}
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">Athlète</th>
                  <th className="px-4 py-3">Coach</th>
                  {showAdmin && <th className="px-4 py-3">Admin</th>}
                  <th className="px-4 py-3 w-48">Complétion</th>
                  <th className="px-4 py-3">Séances</th>
                  <th className="px-4 py-3">LSSS</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.child_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {r.first_name} {r.last_name ?? ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.coach_name ?? '—'}</td>
                    {showAdmin && <td className="px-4 py-3 text-gray-500">{r.admin_name ?? '—'}</td>}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pctTone(r.pct)}`}>
                          {r.pct}%
                        </span>
                        <div className="flex-1">
                          <CompletenessBar pct={r.pct} />
                        </div>
                      </div>
                      {r.missing_count > 0 && (
                        <p className="text-[11px] text-amber-600 mt-1">{r.missing_count} manquant(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.sessions_completed}/{r.total_sessions || 13}
                    </td>
                    <td className="px-4 py-3">
                      {r.pending_lsss ? (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                          En attente
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`${basePath}/${r.child_id}`}
                        className="text-navy-600 font-semibold hover:underline"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
