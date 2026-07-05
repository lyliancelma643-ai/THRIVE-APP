'use client';

// Fiche objectifs THRIVE — objectifs SMART détaillés (échéance + statut + progression).
// Écrit dans public.athlete_objectives (RLS : can_edit_child_bilan).

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { Objective, ObjectiveStatus, fetchObjectives } from '@/lib/bilan';
import { Btn, Select, TextArea, TextInput } from './ui';

const STATUS_OPTS: { value: ObjectiveStatus; label: string }[] = [
  { value: 'not_started', label: 'À démarrer' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'achieved', label: 'Atteint' },
];

export function ObjectivesEditor({ childId }: { childId: string }) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await fetchObjectives(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const add = async (kind: 'TECHNIQUE' | 'LIFE_SKILL') => {
    setError('');
    const { error: e } = await supabase.from('athlete_objectives').insert({
      child_id: childId,
      kind,
      title: kind === 'TECHNIQUE' ? 'Nouvel objectif technique' : 'Nouvel objectif compétence de vie',
      status: 'not_started',
      progress: 0,
      sort_order: items.length,
      created_by: user?.id ?? null,
    });
    if (e) setError(e.message);
    else await load();
  };

  const patch = async (id: string, changes: Partial<Objective>) => {
    setItems((xs) => xs.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    const { error: e } = await supabase
      .from('athlete_objectives')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (e) setError(e.message);
  };

  const remove = async (id: string) => {
    setItems((xs) => xs.filter((o) => o.id !== id));
    await supabase.from('athlete_objectives').delete().eq('id', id);
  };

  if (loading) return <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />;

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      {items.length === 0 && (
        <p className="text-sm text-gray-400">Aucun objectif pour l&apos;instant.</p>
      )}

      {items.map((o) => (
        <div key={o.id} className="rounded-xl border border-gray-200 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                o.kind === 'TECHNIQUE' ? 'bg-navy-50 text-navy-700' : 'bg-sage/30 text-navy-800'
              }`}
            >
              {o.kind === 'TECHNIQUE' ? 'Technique' : 'Compétence de vie'}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => remove(o.id)}
              className="text-gray-400 hover:text-red-600 text-sm w-9 h-9 rounded-lg hover:bg-red-50 cursor-pointer"
              aria-label="Supprimer l'objectif"
            >
              ✕
            </button>
          </div>

          <TextInput
            label="Intitulé (SMART)"
            value={o.title}
            onChange={(v) => patch(o.id, { title: v })}
          />
          <TextArea
            label="Détails"
            value={o.description ?? ''}
            onChange={(v) => patch(o.id, { description: v })}
            rows={2}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextInput
              label="Échéance"
              type="date"
              value={o.due_date ?? ''}
              onChange={(v) => patch(o.id, { due_date: v || null })}
            />
            <Select
              label="Statut"
              value={o.status}
              onChange={(v) => patch(o.id, { status: v as ObjectiveStatus })}
              options={STATUS_OPTS}
            />
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">
                Progression · {o.progress}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={o.progress}
                onChange={(e) => patch(o.id, { progress: Number(e.target.value) })}
                className="w-full accent-navy-600"
              />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <Btn variant="ghost" onClick={() => add('TECHNIQUE')}>
          + Objectif technique
        </Btn>
        <Btn variant="ghost" onClick={() => add('LIFE_SKILL')}>
          + Objectif compétence de vie
        </Btn>
      </div>
    </div>
  );
}
