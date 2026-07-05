'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { type Pack, PACK_LABELS, PACK_ORDER, asPack } from '@/lib/packs';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParentRow {
  // Depuis profiles
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  registration_status?: string | null;
  is_active: boolean;
  created_at: string;
  // Depuis families (peut être null si pas encore créée)
  family_id?: string | null;
  family_name?: string | null;
  city?: string | null;
  province?: string | null;
  children_count?: number;
  pack?: Pack | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  active:    { label: 'Actif',       color: 'bg-green-100 text-green-700'   },
  completed: { label: 'Complété',    color: 'bg-navy-100 text-navy-700'     },
  inactive:  { label: 'Inactif',     color: 'bg-gray-100 text-gray-500'     },
};

const getStatus = (s?: string | null) =>
  STATUS_LABELS[s ?? ''] ?? { label: s ?? '—', color: 'bg-gray-100 text-gray-500' };

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AdminFamiliesPage() {
  const [parents, setParents]     = useState<ParentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'all' | 'with_family' | 'without_family'>('all');

  // ── Chargement ──────────────────────────────────────────────────────────────
  const fetchParents = useCallback(async () => {
    setIsLoading(true);

    // 1. Tous les profils PARENT
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone_number, registration_status, is_active, created_at')
      .eq('role', 'PARENT')
      .order('created_at', { ascending: false });

    if (!profilesData) { setIsLoading(false); return; }

    // 2. Toutes les familles avec le compte des enfants
    const { data: familiesData } = await supabase
      .from('families')
      .select('id, name, parent_id, city, province, pack');

    const { data: childrenData } = await supabase
      .from('children')
      .select('id, family_id');

    // 3. Merge côté client
    const familyMap = new Map<string, NonNullable<typeof familiesData>[number]>();
    familiesData?.forEach((f) => familyMap.set(f.parent_id, f));

    const childCountMap = new Map<string, number>();
    childrenData?.forEach((c) => {
      childCountMap.set(c.family_id, (childCountMap.get(c.family_id) ?? 0) + 1);
    });

    const rows: ParentRow[] = profilesData.map((p) => {
      const fam = familyMap.get(p.id);
      return {
        ...p,
        family_id:     fam?.id ?? null,
        family_name:   fam?.name ?? null,
        city:          fam?.city ?? null,
        province:      fam?.province ?? null,
        children_count: fam ? (childCountMap.get(fam.id) ?? 0) : 0,
        pack:          fam ? asPack(fam.pack) : null,
      };
    });

    setParents(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchParents(); }, [fetchParents]);

  // ── Attribution du pack (ADMIN/SUPER_ADMIN — verrou base, migration 023) ──────
  const [savingId, setSavingId] = useState<string | null>(null);
  const updatePack = useCallback(async (familyId: string, pack: Pack) => {
    setSavingId(familyId);
    // Optimiste : on reflète tout de suite ; le realtime confirmera (ou on revert)
    setParents((prev) => prev.map((p) => (p.family_id === familyId ? { ...p, pack } : p)));
    const { error } = await supabase.from('families').update({ pack }).eq('id', familyId);
    setSavingId(null);
    if (error) {
      alert('Impossible de modifier le pack : ' + error.message);
      fetchParents();
    }
  }, [fetchParents]);

  // ── Realtime — écoute profiles + families ───────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-families-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchParents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, fetchParents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, fetchParents)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchParents]);

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const filtered = parents.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      `${p.first_name} ${p.last_name} ${p.email} ${p.family_name ?? ''} ${p.city ?? ''}`
        .toLowerCase()
        .includes(q);
    const matchFilter =
      filter === 'all' ||
      (filter === 'with_family'    && !!p.family_id) ||
      (filter === 'without_family' && !p.family_id);
    return matchSearch && matchFilter;
  });

  const withFamily    = parents.filter((p) => !!p.family_id).length;
  const withoutFamily = parents.filter((p) => !p.family_id).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Familles & Parents 👨‍👩‍👧‍👦</h1>
          <p className="text-gray-500 mt-1">
            {parents.length} parent{parents.length > 1 ? 's' : ''} inscrit{parents.length > 1 ? 's' : ''}
            {' · '}<span className="text-green-600 font-medium">{withFamily} avec famille</span>
            {' · '}<span className="text-yellow-600 font-medium">{withoutFamily} sans famille</span>
          </p>
        </div>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher par nom, email, famille, ville…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all',            label: 'Tous' },
            { key: 'with_family',    label: '✅ Avec famille' },
            { key: 'without_family', label: '⏳ Sans famille' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                filter === key ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Parent</th>
              <th className="px-6 py-4 hidden md:table-cell">Email</th>
              <th className="px-6 py-4">Famille</th>
              <th className="px-6 py-4 hidden lg:table-cell">Ville</th>
              <th className="px-6 py-4 hidden sm:table-cell">Enfants</th>
              <th className="px-6 py-4">Pack</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4 hidden lg:table-cell">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center">
                  <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
                  <p className="text-gray-500 font-medium">
                    {search || filter !== 'all'
                      ? 'Aucun résultat pour cette recherche'
                      : 'Aucun parent inscrit pour le moment'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((parent) => {
                const { label, color } = getStatus(parent.registration_status);
                return (
                  <tr key={parent.id} className="border-t hover:bg-gray-50 transition-colors">
                    {/* Parent */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(parent.first_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {parent.first_name} {parent.last_name}
                          </p>
                          <p className="text-xs text-gray-400 md:hidden">{parent.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-500">
                      {parent.email}
                    </td>

                    {/* Famille */}
                    <td className="px-6 py-4">
                      {parent.family_name ? (
                        <span className="font-medium text-sm">{parent.family_name}</span>
                      ) : (
                        <span className="text-xs text-yellow-600 bg-yellow-50 rounded-full px-2 py-1">
                          Non créée
                        </span>
                      )}
                    </td>

                    {/* Ville */}
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-500">
                      {parent.city
                        ? `${parent.city}${parent.province ? `, ${parent.province}` : ''}`
                        : '—'}
                    </td>

                    {/* Enfants */}
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="bg-gray-100 rounded-full px-3 py-1 text-xs font-semibold">
                        {parent.children_count ?? 0} enfant{(parent.children_count ?? 0) > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Pack — modifiable par l'admin (upgrade / downgrade) */}
                    <td className="px-6 py-4">
                      {parent.family_id ? (
                        <select
                          value={parent.pack ?? 'ESSENTIEL'}
                          disabled={savingId === parent.family_id}
                          onChange={(e) => updatePack(parent.family_id!, e.target.value as Pack)}
                          aria-label={`Pack de la famille ${parent.family_name ?? ''}`}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 cursor-pointer"
                        >
                          {PACK_ORDER.map((p) => (
                            <option key={p} value={p}>
                              {PACK_LABELS[p]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
                        {label}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-gray-400">
                      {new Date(parent.created_at).toLocaleDateString('fr-CA')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
