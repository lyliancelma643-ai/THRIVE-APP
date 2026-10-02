'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import {
  confirmationMailto,
  deadlineLabel,
  dueDate,
  sortByDeadline,
  urgency,
  type DeletionRequestRow,
} from '@/lib/deletion-requests';

// ─────────────────────────────────────────────────────────────────────────────
// Demandes de suppression de compte (droit à l'effacement, Loi 25).
//   • File d'attente triée par échéance légale (réception + 30 jours, posée en
//     base par la migration 067) ; responsable = super-admin par défaut.
//   • « Supprimer définitivement » (super-admin) : edge function
//     admin-delete-user avec requestId → annule l'abonnement web, supprime le
//     compte et ses données, clôt la demande (la trace survit).
//   • « Annuler la demande » (admin) : retrait ou refus motivé.
//   • Registre des demandes traitées : 12 mois, puis purge automatique.
// ─────────────────────────────────────────────────────────────────────────────

const SELECT =
  'id, status, target_profile_id, target_email, target_name, reason, requested_at, due_at, processed_at, resolution_note, store_subscription, ' +
  'assigned:profiles!deletion_requests_assigned_to_fkey(first_name, last_name, email)';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const STORE_LABEL: Record<string, string> = { app_store: 'App Store (iPhone)', play_store: 'Google Play (Android)' };

type Done = { id: string; email: string | null; name: string | null; store: string | null };

export default function AdminSuppressionsPage() {
  const isSuper = useAuthStore((s) => s.user?.role === 'SUPER_ADMIN');
  const [pending, setPending] = useState<DeletionRequestRow[]>([]);
  const [history, setHistory] = useState<DeletionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<Done | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [p, h] = await Promise.all([
      supabase.from('deletion_requests').select(SELECT).eq('status', 'PENDING').order('requested_at'),
      supabase
        .from('deletion_requests')
        .select(SELECT)
        .neq('status', 'PENDING')
        .order('processed_at', { ascending: false })
        .limit(50),
    ]);
    if (p.error || h.error) {
      setError('Impossible de charger les demandes. Vérifie que la migration 067 est appliquée.');
    } else {
      setPending(sortByDeadline((p.data ?? []) as unknown as DeletionRequestRow[]));
      setHistory((h.data ?? []) as unknown as DeletionRequestRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const purge = async (r: DeletionRequestRow) => {
    if (!r.target_profile_id) return;
    setBusy(r.id);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId: r.target_profile_id, requestId: r.id },
    });
    if (err) {
      let msg = 'La suppression a échoué.';
      const ctx = (err as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const payload = await ctx.json().catch(() => null);
        if (payload?.error) msg = String(payload.error);
      }
      setError(msg);
    } else {
      setDone({
        id: r.id,
        email: r.target_email,
        name: r.target_name,
        store: (data as { storeSubscription?: string | null } | null)?.storeSubscription ?? null,
      });
    }
    setConfirming(null);
    setBusy(null);
    await load();
  };

  const cancel = async (r: DeletionRequestRow) => {
    if (!note.trim()) {
      setError('Indique le motif (retrait par le parent, demande en double, identité non vérifiée…).');
      return;
    }
    setBusy(r.id);
    const { error: err } = await supabase
      .from('deletion_requests')
      .update({ status: 'CANCELLED', resolution_note: note.trim() })
      .eq('id', r.id);
    if (err) setError('L’annulation n’a pas été enregistrée.');
    setCancelling(null);
    setNote('');
    setBusy(null);
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[28px] md:text-3xl leading-tight font-semibold text-navy-900 tracking-tight">
          Demandes de suppression
        </h1>
        <p className="text-slate-600 text-sm mt-1 max-w-2xl">
          Droit à l&apos;effacement (Loi 25) : chaque demande doit être traitée au plus tard{' '}
          <strong>30 jours</strong> après sa réception. Le responsable par défaut est le
          super-administrateur du compte. Le registre des demandes traitées est conservé 12 mois.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {done && (
        <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 space-y-2">
          <p>
            Compte supprimé{done.email ? ` (${done.email})` : ''}. La demande est close.
          </p>
          {done.store && (
            <p className="font-semibold">
              Abonnement {STORE_LABEL[done.store] ?? done.store} encore actif : demande au parent de
              l&apos;annuler depuis son téléphone (impossible côté serveur).
            </p>
          )}
          {done.email && (
            <a
              href={confirmationMailto(done.email, done.name)}
              className="inline-flex px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold"
            >
              Envoyer la confirmation au parent
            </a>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" aria-hidden />
      ) : (
        <>
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900">À traiter</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {pending.length}
              </span>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune demande en attente.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((r) => {
                  const u = urgency(r);
                  const assigned = r.assigned
                    ? `${r.assigned.first_name ?? ''} ${r.assigned.last_name ?? ''}`.trim() || r.assigned.email
                    : 'Non attribuée';
                  return (
                    <li key={r.id} className="py-4 space-y-3" data-testid="deletion-request">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{r.target_name || r.target_email || 'Compte'}</p>
                          <p className="text-xs text-slate-600">
                            {r.target_email} · reçue le {fmt(r.requested_at)} · échéance le{' '}
                            {fmt(dueDate(r).toISOString())} · responsable : {assigned}
                          </p>
                          {r.reason && <p className="text-sm text-slate-700 mt-1">« {r.reason} »</p>}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                            u === 'late'
                              ? 'bg-red-100 text-red-700'
                              : u === 'soon'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {deadlineLabel(r)}
                        </span>
                      </div>

                      {confirming === r.id ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3">
                          <p>
                            Suppression <strong>définitive</strong> du compte {r.target_email} : profil, famille
                            dont il est titulaire (enfants, bilans, séances, messages, Maison). L&apos;abonnement
                            web est annulé automatiquement. Un co-parent garde son propre compte.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => purge(r)}
                              disabled={busy === r.id}
                              className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50"
                            >
                              {busy === r.id ? 'Suppression…' : 'Confirmer la suppression'}
                            </button>
                            <button onClick={() => setConfirming(null)} className="px-4 py-2 rounded-xl border border-red-200 font-semibold">
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : cancelling === r.id ? (
                        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                          <label className="block text-sm">
                            <span className="block text-xs font-semibold text-slate-700 mb-1">Motif (visible dans le registre)</span>
                            <input
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2"
                              placeholder="Retirée par le parent le…"
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => cancel(r)}
                              disabled={busy === r.id}
                              className="px-4 py-2 rounded-xl bg-navy-600 text-white font-semibold disabled:opacity-50"
                            >
                              Enregistrer l&apos;annulation
                            </button>
                            <button
                              onClick={() => {
                                setCancelling(null);
                                setNote('');
                              }}
                              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
                            >
                              Retour
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {isSuper ? (
                            <button
                              onClick={() => {
                                setDone(null);
                                setConfirming(r.id);
                              }}
                              disabled={!r.target_profile_id}
                              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                            >
                              Supprimer définitivement…
                            </button>
                          ) : (
                            <p className="text-xs text-slate-600 self-center">
                              La suppression définitive est réservée au super-administrateur.
                            </p>
                          )}
                          <button
                            onClick={() => setCancelling(r.id)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                          >
                            Annuler la demande…
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-bold text-navy-900 mb-4">Registre (12 derniers mois)</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune demande traitée.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {history.map((r) => (
                  <li key={r.id} className="py-3 flex flex-wrap justify-between gap-2">
                    <span className="text-slate-800">{r.target_email ?? 'Compte supprimé'}</span>
                    <span className="text-slate-600">
                      {r.status === 'PURGED' ? 'Supprimé' : r.status === 'CANCELLED' ? 'Annulée' : 'Anonymisé'} le{' '}
                      {fmt(r.processed_at)} · reçue le {fmt(r.requested_at)}
                      {r.resolution_note ? ` · ${r.resolution_note}` : ''}
                      {r.store_subscription ? ` · abonnement ${STORE_LABEL[r.store_subscription] ?? r.store_subscription} à faire annuler` : ''}
                    </span>
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
