'use client';

// Super admin — structure de supervision : assigner / réassigner chaque coach à
// un admin. Un coach a un admin superviseur ; un admin peut superviser plusieurs
// coachs. Écrit dans public.admin_coach_supervision (RLS : super admin only).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

type Profile = { id: string; first_name: string | null; last_name: string | null; email: string };
type Supervision = { id: string; admin_id: string; coach_id: string; is_active: boolean };

export default function SupervisionPage() {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [links, setLinks] = useState<Supervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isSuper = user?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    const [profilesRes, linksRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['ADMIN', 'SUPER_ADMIN', 'COACH'])
        .eq('is_active', true)
        .order('first_name'),
      supabase.from('admin_coach_supervision').select('id, admin_id, coach_id, is_active').eq('is_active', true),
    ]);
    const profs = (profilesRes.data ?? []) as (Profile & { role: string })[];
    setAdmins(profs.filter((p) => p.role === 'ADMIN' || p.role === 'SUPER_ADMIN'));
    setCoaches(profs.filter((p) => p.role === 'COACH'));
    setLinks((linksRes.data ?? []) as Supervision[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('supervision-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_coach_supervision' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const supervisorOf = useCallback(
    (coachId: string) => links.find((l) => l.coach_id === coachId)?.admin_id ?? '',
    [links]
  );

  const countByAdmin = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of links) m.set(l.admin_id, (m.get(l.admin_id) ?? 0) + 1);
    return m;
  }, [links]);

  const reassign = async (coachId: string, adminId: string) => {
    setSavingId(coachId);
    setError('');
    try {
      // Un seul superviseur actif par coach : on désactive les autres…
      const { error: offErr } = await supabase
        .from('admin_coach_supervision')
        .update({ is_active: false })
        .eq('coach_id', coachId)
        .eq('is_active', true);
      if (offErr) throw offErr;
      // …puis on (ré)active le lien choisi.
      if (adminId) {
        const { error: upErr } = await supabase.from('admin_coach_supervision').upsert(
          { admin_id: adminId, coach_id: coachId, assigned_by: user?.id, is_active: true },
          { onConflict: 'admin_id,coach_id' }
        );
        if (upErr) throw upErr;
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Réassignation impossible');
    } finally {
      setSavingId(null);
    }
  };

  if (!isSuper) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="text-slate-500">
          Seul le super administrateur peut gérer la structure de supervision.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Structure de supervision 🧭</h1>
      <p className="text-slate-500 mb-8">
        Assignez chaque coach à un administrateur superviseur. L&apos;admin ne voit et ne gère que
        les dossiers des coachs qui lui sont confiés.
      </p>

      {error && <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {/* Résumé des admins */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {admins.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="font-semibold text-slate-900">
              {a.first_name} {a.last_name}
            </p>
            <p className="text-xs text-slate-400">{a.email}</p>
            <p className="text-sm text-navy-600 font-medium mt-2">
              {countByAdmin.get(a.id) ?? 0} coach(s) supervisé(s)
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : coaches.length === 0 ? (
        <p className="text-slate-400">Aucun coach actif.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-slate-100">
                  <th className="px-5 py-3">Coach</th>
                  <th className="px-5 py-3">Admin superviseur</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={supervisorOf(c.id)}
                        disabled={savingId === c.id}
                        onChange={(e) => reassign(c.id, e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                      >
                        <option value="">— Aucun (non supervisé) —</option>
                        {admins.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.first_name} {a.last_name}
                          </option>
                        ))}
                      </select>
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
