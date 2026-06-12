'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type Coach = { id: string; first_name: string; last_name: string };
type ChildRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  coach_id: string | null;
  assignment_id: string | null;
};

export default function AdminAssignmentsPage() {
  const { user } = useAuthStore();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [coachesRes, childrenRes, assignmentsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'COACH')
        .eq('is_active', true)
        .order('first_name'),
      supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth')
        .eq('is_active', true)
        .order('first_name'),
      supabase
        .from('coach_assignments')
        .select('id, coach_id, child_id')
        .eq('is_active', true),
    ]);

    const assignmentByChild = new Map(
      (assignmentsRes.data ?? []).map((a) => [a.child_id, a])
    );

    setCoaches((coachesRes.data ?? []) as Coach[]);
    setChildren(
      ((childrenRes.data ?? []) as Omit<ChildRow, 'coach_id' | 'assignment_id'>[]).map((c) => ({
        ...c,
        coach_id: assignmentByChild.get(c.id)?.coach_id ?? null,
        assignment_id: assignmentByChild.get(c.id)?.id ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime : nouveaux enfants / coaches / assignations visibles sans recharger
  useEffect(() => {
    const channel = supabase
      .channel('admin-assignments-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_assignments' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const assign = async (child: ChildRow, coachId: string) => {
    setSavingId(child.id);
    setError('');
    try {
      // Désactiver l'assignation actuelle si elle existe
      if (child.assignment_id) {
        const { error: offErr } = await supabase
          .from('coach_assignments')
          .update({ is_active: false })
          .eq('id', child.assignment_id);
        if (offErr) throw offErr;
      }
      if (coachId) {
        // Réactive si une ligne (coach, enfant) existe déjà, sinon insère
        const { error: upErr } = await supabase
          .from('coach_assignments')
          .upsert(
            {
              coach_id: coachId,
              child_id: child.id,
              assigned_by: user?.id,
              is_active: true,
            },
            { onConflict: 'coach_id,child_id' }
          );
        if (upErr) throw upErr;
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'assignation");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Assignations coach ↔ enfants 🤝</h1>
      <p className="text-gray-500 mb-8">
        Chaque coach n&apos;a accès qu&apos;aux enfants que vous lui confiez ici.
      </p>

      {error && <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <p className="text-gray-400">Aucun enfant enregistré pour l&apos;instant.</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Enfant</th>
                <th className="px-5 py-3 font-medium">Âge</th>
                <th className="px-5 py-3 font-medium">Coach assigné</th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium">
                    {c.first_name} {c.last_name ?? ''}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {c.date_of_birth
                      ? `${Math.floor(
                          (Date.now() - new Date(c.date_of_birth).getTime()) /
                            (365.25 * 24 * 3600 * 1000)
                        )} ans`
                      : '–'}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={c.coach_id ?? ''}
                      disabled={savingId === c.id}
                      onChange={(e) => assign(c, e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="">— Aucun coach —</option>
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.first_name} {coach.last_name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
