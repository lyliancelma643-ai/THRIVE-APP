'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Panneau coach : familles assignées en attente de SA validation.
// Le clic appelle validate_parent_access() (RPC SECURITY DEFINER — vérifie
// côté serveur que le coach est bien assigné à un enfant de ce parent).
// Invisible tant que la migration 035 n'est pas appliquée, ou si rien n'attend.
// ─────────────────────────────────────────────────────────────────────────────

type PendingParent = { id: string; name: string; childNames: string };

export function PendingFamiliesPanel({ coachId }: { coachId: string }) {
  const [pending, setPending] = useState<PendingParent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Enfants assignés → familles → parents non validés
    const { data: assigns, error } = await supabase
      .from('coach_assignments')
      .select('child_id, children(first_name, family_id, families(parent_id))')
      .eq('coach_id', coachId);
    if (error || !assigns?.length) return;

    const byParent = new Map<string, string[]>();
    for (const a of assigns as unknown as {
      children: { first_name: string; families: { parent_id: string } | null } | null;
    }[]) {
      const pid = a.children?.families?.parent_id;
      if (!pid) continue;
      byParent.set(pid, [...(byParent.get(pid) ?? []), a.children!.first_name]);
    }
    if (byParent.size === 0) return;

    const { data: parents, error: pErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, coach_validated')
      .in('id', Array.from(byParent.keys()))
      .eq('coach_validated', false);
    if (pErr) return; // colonne absente = migration 035 pas appliquée → silencieux

    setPending(
      (parents ?? []).map((p) => ({
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email,
        childNames: (byParent.get(p.id) ?? []).join(', '),
      })),
    );
  }, [coachId]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = async (parentId: string) => {
    setBusy(parentId);
    await supabase.rpc('validate_parent_access', { p_parent: parentId });
    setPending((prev) => prev.filter((p) => p.id !== parentId));
    setBusy(null);
  };

  if (pending.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl bg-sun/15 border border-sun/40 p-5">
      <h2 className="font-semibold text-navy-900">Familles en attente de votre validation</h2>
      <p className="text-sm text-navy-600/70 mt-0.5 mb-4">
        Leur espace reste en aperçu tant que vous n&apos;avez pas ouvert l&apos;accès.
      </p>
      <ul className="space-y-2">
        {pending.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-xl bg-white px-4 py-3 shadow-card"
          >
            <div>
              <p className="font-semibold text-navy-900 text-sm">{p.name}</p>
              <p className="text-xs text-navy-600/60">Enfant(s) : {p.childNames}</p>
            </div>
            <button
              onClick={() => validate(p.id)}
              disabled={busy === p.id}
              className="shrink-0 px-4 py-2 rounded-xl bg-navy-600 text-white text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 transition-colors"
            >
              {busy === p.id ? '…' : "Ouvrir l'accès"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
