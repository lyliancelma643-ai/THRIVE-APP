'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string | null;
  sport?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  family_id: string;
  // Jointures
  family_name?: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  programs_count?: number;
  badges_count?: number;
}

const age = (dob: string) =>
  Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

const GENDER_LABEL: Record<string, string> = {
  male: 'Garçon', female: 'Fille', other: 'Autre',
  MALE: 'Garçon', FEMALE: 'Fille', OTHER: 'Autre',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchChildren = useCallback(async () => {
    setIsLoading(true);

    // 1. Enfants
    const { data: kidsData } = await supabase
      .from('children')
      .select('id, first_name, last_name, date_of_birth, gender, sport, notes, is_active, created_at, family_id')
      .order('first_name');

    if (!kidsData) { setIsLoading(false); return; }

    // 2. Familles
    const { data: famData } = await supabase
      .from('families')
      .select('id, name, parent_id');

    // 3. Parents
    const parentIds = [...new Set((famData ?? []).map((f) => f.parent_id))];
    const { data: parentData } = parentIds.length
      ? await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', parentIds)
      : { data: [] };

    // 4. Inscriptions programmes
    const { data: enrollData } = await supabase
      .from('program_enrollments')
      .select('id, child_id');

    // 5. Badges
    const { data: badgeData } = await supabase
      .from('child_badges')
      .select('id, child_id');

    // Maps
    const famMap = new Map<string, { name: string; parent_id: string }>();
    famData?.forEach((f) => famMap.set(f.id, { name: f.name, parent_id: f.parent_id }));

    const parentMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    parentData?.forEach((p) => parentMap.set(p.id, p));

    const enrollMap = new Map<string, number>();
    enrollData?.forEach((e) => enrollMap.set(e.child_id, (enrollMap.get(e.child_id) ?? 0) + 1));

    const badgeMap = new Map<string, number>();
    badgeData?.forEach((b) => badgeMap.set(b.child_id, (badgeMap.get(b.child_id) ?? 0) + 1));

    const rows: Child[] = kidsData.map((k) => {
      const fam    = famMap.get(k.family_id);
      const parent = fam ? parentMap.get(fam.parent_id) : undefined;
      return {
        ...k,
        family_name:    fam?.name ?? null,
        parent_name:    parent ? `${parent.first_name} ${parent.last_name}` : null,
        parent_email:   parent?.email ?? null,
        programs_count: enrollMap.get(k.id) ?? 0,
        badges_count:   badgeMap.get(k.id)  ?? 0,
      };
    });

    setChildren(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('admin-children-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' },          fetchChildren)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' },          fetchChildren)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'program_enrollments'}, fetchChildren)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'child_badges' },       fetchChildren)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchChildren]);

  const filtered = children.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      `${c.first_name} ${c.last_name} ${c.family_name ?? ''} ${c.parent_name ?? ''} ${c.sport ?? ''}`
        .toLowerCase().includes(q);
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active'   &&  c.is_active) ||
      (filterActive === 'inactive' && !c.is_active);
    return matchSearch && matchActive;
  });

  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Enfants 🧒</h1>
          <p className="text-gray-500 mt-1">
            {children.length} enfant{children.length > 1 ? 's' : ''} enregistré{children.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Recherche + filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher par nom, famille, parent, sport…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                filterActive === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {{ all: 'Tous', active: 'Actifs', inactive: 'Inactifs' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Enfant</th>
              <th className="px-6 py-4 hidden md:table-cell">Famille</th>
              <th className="px-6 py-4 hidden lg:table-cell">Parent</th>
              <th className="px-6 py-4">Âge</th>
              <th className="px-6 py-4 hidden sm:table-cell">Sport</th>
              <th className="px-6 py-4 hidden sm:table-cell">Programmes</th>
              <th className="px-6 py-4 hidden sm:table-cell">Badges</th>
              <th className="px-6 py-4">Statut</th>
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
                  <div className="text-4xl mb-3">🧒</div>
                  <p className="text-gray-500 font-medium">
                    {search || filterActive !== 'all' ? 'Aucun résultat.' : 'Aucun enfant enregistré pour le moment.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((child) => (
                <tr key={child.id} className="border-t hover:bg-gray-50 transition-colors">
                  {/* Enfant */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {child.first_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{child.first_name} {child.last_name}</p>
                        {child.gender && (
                          <p className="text-xs text-gray-400">{GENDER_LABEL[child.gender] ?? child.gender}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Famille */}
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-600">
                    {child.family_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  {/* Parent */}
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {child.parent_name ? (
                      <div>
                        <p className="text-sm font-medium">{child.parent_name}</p>
                        <p className="text-xs text-gray-400">{child.parent_email}</p>
                      </div>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  {/* Âge */}
                  <td className="px-6 py-4 text-sm font-medium">
                    {age(child.date_of_birth)} ans
                  </td>
                  {/* Sport */}
                  <td className="px-6 py-4 hidden sm:table-cell text-sm text-gray-500">
                    {child.sport ?? '—'}
                  </td>
                  {/* Programmes */}
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {child.programs_count} prog.
                    </span>
                  </td>
                  {/* Badges */}
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="bg-yellow-100 text-yellow-700 rounded-full px-3 py-1 text-xs font-semibold">
                      🏅 {child.badges_count}
                    </span>
                  </td>
                  {/* Statut */}
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      child.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {child.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
