'use client';

// Routine de pré-tir — séquence d'étapes personnalisée et éditable.
// Stockée dans public.athlete_identity.routine (jsonb : [{step, label}]).

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { Btn, SavePill, nowHM } from './ui';

type Step = { step: number; label: string };

const DEFAULT_ROUTINE: Step[] = [
  { step: 1, label: 'Respire · 3 cycles lents' },
  { step: 2, label: 'Visualise le geste parfait' },
  { step: 3, label: 'Mot-ancre' },
  { step: 4, label: "Action — j'y vais" },
];

export function RoutineEditor({ childId }: { childId: string }) {
  const { user } = useAuthStore();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('athlete_identity')
      .select('routine')
      .eq('child_id', childId)
      .maybeSingle();
    const r = Array.isArray(data?.routine) ? (data!.routine as Step[]) : [];
    setSteps(r.length ? r : DEFAULT_ROUTINE);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    const cleaned = steps
      .map((s) => ({ ...s, label: s.label.trim() }))
      .filter((s) => s.label)
      .map((s, i) => ({ step: i + 1, label: s.label }));
    const { error: e } = await supabase
      .from('athlete_identity')
      .upsert({ child_id: childId, routine: cleaned, updated_by: user?.id ?? null }, { onConflict: 'child_id' });
    setSaving(false);
    if (e) setError(e.message);
    else setSavedAt(nowHM());
  };

  if (loading) return <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="shrink-0 w-8 h-8 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </span>
            <input
              type="text"
              value={s.label}
              onChange={(e) =>
                setSteps((xs) => xs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              onClick={() => setSteps((xs) => xs.filter((_, j) => j !== i))}
              className="shrink-0 w-10 h-10 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 cursor-pointer"
              aria-label="Supprimer l'étape"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setSteps((xs) => [...xs, { step: xs.length + 1, label: '' }])}
        className="text-sm font-medium text-navy-600 hover:text-navy-800 cursor-pointer"
      >
        + Ajouter une étape
      </button>
      <div className="flex items-center gap-3 pt-1">
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la routine'}
        </Btn>
        <SavePill savedAt={savedAt} />
      </div>
    </div>
  );
}
