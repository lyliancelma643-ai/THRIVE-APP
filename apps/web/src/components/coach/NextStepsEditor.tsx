'use client';

// Prochaines étapes (Partie 3) — texte libre + échéance + statut, visibles
// par le parent. Écrit dans public.athlete_next_steps.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { NextStep, NextStepStatus, fetchNextSteps } from '@/lib/bilan';
import { Btn, Select, TextInput } from './ui';

const STATUS_OPTS: { value: NextStepStatus; label: string }[] = [
  { value: 'todo', label: 'À faire' },
  { value: 'doing', label: 'En cours' },
  { value: 'done', label: 'Fait' },
];

export function NextStepsEditor({ childId }: { childId: string }) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await fetchNextSteps(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const add = async () => {
    setError('');
    const { error: e } = await supabase.from('athlete_next_steps').insert({
      child_id: childId,
      label: 'Nouvelle action',
      status: 'todo',
      sort_order: items.length,
      created_by: user?.id ?? null,
    });
    if (e) setError(e.message);
    else await load();
  };

  const patch = async (id: string, changes: Partial<NextStep>) => {
    setItems((xs) => xs.map((s) => (s.id === id ? { ...s, ...changes } : s)));
    const { error: e } = await supabase
      .from('athlete_next_steps')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (e) setError(e.message);
  };

  const remove = async (id: string) => {
    setItems((xs) => xs.filter((s) => s.id !== id));
    await supabase.from('athlete_next_steps').delete().eq('id', id);
  };

  if (loading) return <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
      {items.length === 0 && (
        <p className="text-sm text-gray-400">Aucune prochaine étape définie.</p>
      )}
      {items.map((s) => (
        <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <TextInput value={s.label} onChange={(v) => patch(s.id, { label: v })} />
          </div>
          <div className="w-full sm:w-40">
            <TextInput
              type="date"
              value={s.due_date ?? ''}
              onChange={(v) => patch(s.id, { due_date: v || null })}
            />
          </div>
          <div className="w-full sm:w-36">
            <Select
              value={s.status}
              onChange={(v) => patch(s.id, { status: v as NextStepStatus })}
              options={STATUS_OPTS}
            />
          </div>
          <button
            onClick={() => remove(s.id)}
            className="shrink-0 w-10 h-10 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 cursor-pointer"
            aria-label="Supprimer"
          >
            ✕
          </button>
        </div>
      ))}
      <Btn variant="ghost" onClick={add}>
        + Ajouter une étape
      </Btn>
    </div>
  );
}
