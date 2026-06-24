'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { AthleteIdentityEditor } from '@/components/AthleteIdentityEditor';

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
  // Suppression définitive
  const [confirmChild, setConfirmChild] = useState<Child | null>(null);
  const [identityChild, setIdentityChild] = useState<Child | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  // Suppression réelle : la cascade Postgres retire aussi séances, rapports,
  // badges, inscriptions, assignations et runs vidéo liés. Le realtime propage
  // la disparition au compte parent (ChildSwitcher) et aux espaces coach.
  const deleteChild = async () => {
    if (!confirmChild) return;
    setDeleting(true);
    setDeleteError('');
    const { error } = await supabase.from('children').delete().eq('id', confirmChild.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setNotice({ type: 'ok', text: `« ${confirmChild.first_name} » a été supprimé définitivement.` });
    setConfirmChild(null);
    await fetchChildren();
  };

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

      {/* Notification */}
      {notice && (
        <div className={`mb-4 rounded-xl p-3 text-sm flex items-center justify-between ${
          notice.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

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
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-14 text-center">
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
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIdentityChild(child)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors"
                      >
                        Identité
                      </button>
                      <button
                        onClick={() => { setDeleteError(''); setConfirmChild(child); }}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modale de confirmation — suppression définitive */}
      {confirmChild && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!deleting) setConfirmChild(null); }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Supprimer définitivement ?</h2>
            <p className="text-sm text-gray-600 mb-1">
              Vous allez supprimer{' '}
              <span className="font-semibold">{confirmChild.first_name} {confirmChild.last_name}</span>
              {confirmChild.parent_name ? <> — famille de {confirmChild.parent_name}</> : null}.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Cela supprime aussi <span className="font-medium">toutes ses séances, rapports, badges,
              inscriptions et assignations</span>. C&apos;est <span className="font-semibold text-red-600">irréversible</span>
              {' '}et se répercute immédiatement sur le compte parent et les coachs.
            </p>
            {deleteError && (
              <p className="mb-3 rounded-lg bg-red-50 text-red-700 text-sm p-2.5">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmChild(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={deleteChild}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale — carte d'identité de l'athlète (admin) */}
      {identityChild && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto"
          onClick={() => setIdentityChild(null)}
        >
          <div
            className="w-full max-w-2xl bg-gray-50 rounded-2xl shadow-xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold">
                  Carte d&apos;identité — {identityChild.first_name} {identityChild.last_name}
                </h2>
                <p className="text-xs text-gray-500">Modifiable par l&apos;admin et le coach.</p>
              </div>
              <button
                onClick={() => setIdentityChild(null)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <AthleteIdentityEditor childId={identityChild.id} childName={identityChild.first_name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
