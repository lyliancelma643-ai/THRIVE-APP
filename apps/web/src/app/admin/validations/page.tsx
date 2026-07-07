'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// File de validation (Admin / Super Admin) :
//   1. Enfants « En attente de confirmation » → confirm_child()
//   2. Parents en attente de validation coach → validate_parent_access()
//      (normalement fait par le coach assigné ; l'admin peut débloquer)
// ─────────────────────────────────────────────────────────────────────────────

type PendingChild = {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  validation_status: string;
  families: { name: string; parent_id: string } | null;
};

type PendingParent = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
};

export default function AdminValidationsPage() {
  const [pendingChildren, setPendingChildren] = useState<PendingChild[]>([]);
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [parentNames, setParentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [childrenRes, parentsRes] = await Promise.all([
      supabase
        .from('children')
        .select('id, first_name, last_name, created_at, validation_status, families(name, parent_id)')
        .eq('validation_status', 'PENDING')
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'PARENT')
        .eq('is_active', true)
        .eq('coach_validated', false)
        .order('created_at'),
    ]);

    if (childrenRes.error || parentsRes.error) {
      // Colonnes absentes = migration 035 pas encore appliquée
      setError(
        'Impossible de charger les validations. Vérifie que la migration 035 (contrôle d’accès) est appliquée.',
      );
      setLoading(false);
      return;
    }

    const kids = (childrenRes.data ?? []) as unknown as PendingChild[];
    setPendingChildren(kids);
    setPendingParents((parentsRes.data ?? []) as PendingParent[]);

    // Nom des parents des enfants en attente
    const parentIds = Array.from(
      new Set(kids.map((c) => c.families?.parent_id).filter(Boolean)),
    ) as string[];
    if (parentIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', parentIds);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) {
        map[p.id] = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;
      }
      setParentNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmChild = async (id: string) => {
    setBusy(id);
    const { error: err } = await supabase.rpc('confirm_child', { p_child: id });
    if (err) setError(err.message);
    await load();
    setBusy(null);
  };

  const validateParent = async (id: string) => {
    setBusy(id);
    const { error: err } = await supabase.rpc('validate_parent_access', { p_parent: id });
    if (err) setError(err.message);
    await load();
    setBusy(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Validations</h1>
        <p className="text-slate-500 text-sm mt-1">
          Cycle d&apos;activation : fiche enfant confirmée par l&apos;équipe, puis accès complet
          ouvert par le coach (ou ici, par un admin).
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        <>
          {/* ── Enfants en attente ── */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900">
                Enfants en attente de confirmation
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {pendingChildren.length}
              </span>
            </div>
            {pendingChildren.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune fiche en attente. ✨</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingChildren.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.families?.name ?? 'Famille inconnue'}
                        {c.families?.parent_id && parentNames[c.families.parent_id]
                          ? ` — parent : ${parentNames[c.families.parent_id]}`
                          : ''}
                        {' · créé le '}
                        {new Date(c.created_at).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    <button
                      onClick={() => confirmChild(c.id)}
                      disabled={busy === c.id}
                      className="shrink-0 px-4 py-2 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 transition-colors"
                    >
                      {busy === c.id ? '…' : 'Confirmer'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Parents en attente de validation coach ── */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900">
                Parents en attente de validation coach
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                {pendingParents.length}
              </span>
            </div>
            {pendingParents.length === 0 ? (
              <p className="text-sm text-slate-400">Tous les parents actifs sont validés. ✨</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingParents.map((p) => (
                  <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.email} · inscrit le {new Date(p.created_at).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    <button
                      onClick={() => validateParent(p.id)}
                      disabled={busy === p.id}
                      className="shrink-0 px-4 py-2 rounded-xl bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark disabled:opacity-50 transition-colors"
                    >
                      {busy === p.id ? '…' : "Activer l'accès"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
