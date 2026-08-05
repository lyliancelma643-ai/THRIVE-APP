'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { Icon } from '@/components/ui';
import { ProspectDrawer } from '@/components/admin/waitlist/ProspectDrawer';
import {
  STATUS_META,
  WAITLIST_COLUMNS,
  WAITLIST_STATUSES,
  callPreferenceLabel,
  formatDate,
  formatDateTime,
  formatPack,
  isOverdue,
  isUpcoming,
  matchesSearch,
  sourceLabel,
  waitlistToCsv,
  type WaitlistRow,
  type WaitlistStatus,
} from '@/lib/waitlist';

// ─────────────────────────────────────────────────────────────────────────────
// Liste d'attente (SUPER ADMIN) — écran d'appel.
//
// Le formulaire public est sur le site vitrine ; ici on reçoit, on appelle, on
// qualifie. La liste sert à choisir qui appeler ; toute l'écriture se fait dans
// la fiche, pour ne jamais modifier la mauvaise ligne en faisant défiler.
//
// Les écritures sont optimistes : l'interface ne doit pas faire attendre pendant
// qu'on a quelqu'un au téléphone.
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = WaitlistStatus | 'ALL' | 'RDV';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'RDV', label: 'Rendez-vous' },
  ...WAITLIST_STATUSES.map((s) => ({ value: s as StatusFilter, label: STATUS_META[s].label })),
];

export default function AdminWaitlistPage() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WaitlistRow | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const flash = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('waitlist')
      .select(WAITLIST_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) {
      setNotice({ type: 'err', text: 'Chargement impossible : ' + error.message });
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as WaitlistRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime : une inscription faite depuis le site apparaît sans recharger.
    const channel = supabase
      .channel('admin-waitlist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // ── Écriture optimiste ────────────────────────────────────────────────────
  const patch = useCallback(
    async (id: string, changes: Partial<WaitlistRow>) => {
      let before: WaitlistRow | undefined;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          before = r;
          return { ...r, ...changes };
        })
      );
      if (!before) return;

      const { error } = await supabase.from('waitlist').update(changes).eq('id', id);
      if (error) {
        const restore = before;
        setRows((prev) => prev.map((r) => (r.id === id ? restore : r)));
        flash('err', "L'enregistrement a échoué : " + error.message);
      }
    },
    []
  );

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    setOpenId(null);
    setRows((prev) => prev.filter((r) => r.id !== target.id));

    const { error } = await supabase.from('waitlist').delete().eq('id', target.id);
    if (error) {
      setRows((prev) =>
        [...prev, target].sort((a, b) => b.created_at.localeCompare(a.created_at))
      );
      flash('err', 'Suppression impossible : ' + error.message);
      return;
    }
    flash('ok', `${target.first_name} a été retiré de la liste.`);
  };

  // ── Filtrage + recherche ──────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === 'RDV' && !r.appointment_at) return false;
        if (filter !== 'ALL' && filter !== 'RDV' && r.status !== filter) return false;
        return matchesSearch(r, search);
      }),
    [rows, filter, search]
  );

  const counts = useMemo(
    () => ({
      total: rows.length,
      // « À appeler » = pas encore joint : les nouveaux et ceux qui n'ont pas répondu.
      toCall: rows.filter((r) => r.status === 'nouveau' || r.status === 'sans réponse').length,
      upcoming: rows.filter((r) => isUpcoming(r.appointment_at)).length,
      converted: rows.filter((r) => r.status === 'converti').length,
    }),
    [rows]
  );

  const open = openId ? (rows.find((r) => r.id === openId) ?? null) : null;

  const exportCsv = () => {
    const blob = new Blob([waitlistToCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thrive-liste-attente-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Liste d&apos;attente</h1>
          <p className="mt-1 text-gray-500">
            Les inscrits du site vitrine, du plus récent au plus ancien. Ouvre une ligne pour voir
            la fiche complète et qualifier l&apos;appel.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-navy-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
        >
          <Icon name="download" className="h-4 w-4" />
          Export CSV ({filtered.length})
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inscrits" value={counts.total} />
        <Stat label="À appeler" value={counts.toCall} tone="amber" />
        <Stat label="Rendez-vous à venir" value={counts.upcoming} tone="indigo" />
        <Stat label="Convertis" value={counts.converted} tone="emerald" />
      </div>

      {notice && (
        <p
          className={`mt-4 rounded-xl p-3 text-sm ${
            notice.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mb-6 mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === f.value ? 'bg-navy-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Rechercher nom, courriel, téléphone, enfant, besoin…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm sm:w-80"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400">
                <th className="px-5 py-3 font-medium">Prospect</th>
                <th className="px-5 py-3 font-medium">Le jeune</th>
                <th className="px-5 py-3 font-medium">Rappel souhaité</th>
                <th className="px-5 py-3 font-medium">Rendez-vous</th>
                <th className="px-5 py-3 font-medium">Pack</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const overdue = isOverdue(r);
                return (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => setOpenId(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenId(r.id);
                      }
                    }}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-navy-50/40 focus:bg-navy-50/60"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy-900">{r.first_name}</p>
                      <p className="text-xs text-gray-400">
                        {r.phone} · {sourceLabel(r.source)}
                      </p>
                      <p className="text-xs text-gray-400">Inscrit le {formatDate(r.created_at)}</p>
                    </td>
                    <td className="px-5 py-3">
                      {r.child_first_name ? (
                        <>
                          <p className="text-navy-900">
                            {r.child_first_name}
                            {r.child_age ? ` · ${r.child_age} ans` : ''}
                          </p>
                          {r.main_need && (
                            <p className="text-xs text-gray-400">{r.main_need}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-xs italic text-gray-300">non renseigné</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {callPreferenceLabel(r.call_preference)}
                    </td>
                    <td className="px-5 py-3">
                      {r.appointment_at ? (
                        <span
                          className={`text-xs font-medium ${
                            overdue ? 'text-red-600' : 'text-navy-700'
                          }`}
                        >
                          {formatDateTime(r.appointment_at)}
                          {overdue && <span className="block text-[11px]">à relancer</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {formatPack(r.pack) || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_META[r.status]?.cls ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_META[r.status]?.label ?? r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-400">
              {rows.length === 0
                ? 'Personne dans la liste d’attente pour l’instant.'
                : 'Aucun inscrit ne correspond à cette recherche.'}
            </p>
          )}
        </div>
      )}

      {open && (
        <ProspectDrawer
          row={open}
          onClose={() => setOpenId(null)}
          onPatch={patch}
          onDelete={setPendingDelete}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-navy-900">Supprimer ce prospect ?</h2>
            <p className="mt-2 text-sm text-gray-600">
              {pendingDelete.first_name} ({pendingDelete.email}) sera retiré définitivement. Son
              adresse redeviendra disponible pour une nouvelle inscription.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="min-h-[44px] flex-1 rounded-xl bg-navy-50 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-100"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'navy',
}: {
  label: string;
  value: number;
  tone?: 'navy' | 'amber' | 'emerald' | 'indigo';
}) {
  const tones = {
    navy: 'text-navy-700',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
  } as const;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
