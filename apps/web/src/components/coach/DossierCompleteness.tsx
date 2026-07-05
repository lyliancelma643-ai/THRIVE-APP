'use client';

// Carte de complétude d'un dossier — checklist normalisée (source SQL
// dossier_completeness) + barre de progression. Alerte visuelle si incomplet.

import { useCallback, useEffect, useState } from 'react';
import { Completeness, fetchCompleteness } from '@/lib/bilan';

export function CompletenessBar({ pct }: { pct: number }) {
  const tone = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-sun' : 'bg-red-400';
  return (
    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DossierCompleteness({
  childId,
  refreshKey = 0,
}: {
  childId: string;
  refreshKey?: number;
}) {
  const [data, setData] = useState<Completeness | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setData(await fetchCompleteness(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  if (loading) return <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />;
  if (!data) return null;

  const complete = data.pct >= 100;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        complete ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${complete ? 'text-emerald-600' : 'text-amber-600'}`}>
            {complete ? '✓' : '⚠'}
          </span>
          <h4 className="text-sm font-bold text-navy-900">
            Dossier {complete ? 'complet' : 'incomplet'} · {data.pct}%
          </h4>
        </div>
        <span className="text-xs text-gray-500">
          {data.done}/{data.total} éléments
        </span>
      </div>

      <CompletenessBar pct={data.pct} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
        {data.items.map((it) => (
          <div key={it.key} className="flex items-center gap-2 text-sm">
            <span className={it.ok ? 'text-emerald-600' : 'text-gray-300'}>
              {it.ok ? '✓' : '○'}
            </span>
            <span className={it.ok ? 'text-navy-700' : 'text-gray-500'}>{it.label}</span>
          </div>
        ))}
      </div>

      {!complete && data.missing.length > 0 && (
        <p className="text-[11px] text-amber-700 mt-3">
          À compléter : {data.missing.join(' · ')}
        </p>
      )}
    </div>
  );
}
