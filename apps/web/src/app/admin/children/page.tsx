'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  is_active: boolean;
  families: { name: string };
  program_enrollments: { id: string }[];
  child_badges: { id: string }[];
}

function calculateAge(dob: string) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function AdminChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchChildren = async () => {
      const { data } = await supabase
        .from('children')
        .select('*, families(name), program_enrollments(id), child_badges(id)')
        .order('first_name');
      setChildren(data ?? []);
      setIsLoading(false);
    };

    fetchChildren();

    // Realtime : nouvel enfant ou mise à jour → on recharge
    const channel = supabase
      .channel('admin-children-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => fetchChildren())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = children.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.families?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Enfants</h1>
          <p className="text-[#a7c4bc] text-sm">{children.length} enfant{children.length > 1 ? 's' : ''}</p>
        </div>
        <input
          className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none w-64"
          placeholder="Rechercher un enfant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#a7c4bc] uppercase tracking-wider bg-white/5 sticky top-0 z-10 border-b border-[#a7c4bc]/30">
              <tr>
                <th className="px-6 py-4 font-medium">Enfant</th>
                <th className="px-6 py-4 font-medium">Famille</th>
                <th className="px-6 py-4 font-medium">Âge</th>
                <th className="px-6 py-4 font-medium">Programmes</th>
                <th className="px-6 py-4 font-medium">Badges</th>
                <th className="px-6 py-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a7c4bc]/10 bg-white/10 backdrop-blur-md">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#a7c4bc]/70">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[#a7c4bc]/70">
                  {search ? 'Aucun résultat.' : 'Aucun enfant enregistré.'}
                </td></tr>
              ) : (
                filtered.map((child) => (
                  <tr key={child.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#F7F5F2]">{child.first_name} {child.last_name}</div>
                      {child.gender && <div className="text-xs text-[#a7c4bc] mt-0.5">{child.gender}</div>}
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]">{child.families?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-[#a7c4bc]">{calculateAge(child.date_of_birth)} ans</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#a7c4bc]/20 text-[#F7F5F2] border border-[#a7c4bc]/30">
                        {child.program_enrollments?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#a7c4bc]/20 text-[#F7F5F2] border border-[#a7c4bc]/30">
                        <span>🏅</span> {child.child_badges?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                        child.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
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
    </div>
  );
}
