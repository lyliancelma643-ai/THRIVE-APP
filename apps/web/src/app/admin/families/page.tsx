'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Family {
  id: string;
  name: string;
  city?: string;
  province?: string;
  created_at: string;
  profiles: { email: string; first_name: string; last_name: string };
  children: { id: string }[];
}

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFamilies = async () => {
      const { data } = await supabase
        .from('families')
        .select('*, profiles(email, first_name, last_name), children(id)')
        .order('created_at', { ascending: false });
      setFamilies(data ?? []);
      setIsLoading(false);
    };

    fetchFamilies();

    // Realtime : nouvelle famille ou nouvel enfant → on recharge
    const channel = supabase
      .channel('admin-families-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, () => fetchFamilies())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () => fetchFamilies())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = families.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.profiles?.email?.toLowerCase().includes(q) ||
      f.profiles?.first_name?.toLowerCase().includes(q) ||
      f.profiles?.last_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Familles</h1>
          <p className="text-[#a7c4bc] text-sm">{families.length} famille{families.length > 1 ? 's' : ''}</p>
        </div>
        <input
          className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 focus:border-gray-400 focus:ring-0 rounded-lg px-3 py-2 text-sm transition-colors outline-none w-64"
          placeholder="Rechercher une famille..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#a7c4bc] uppercase tracking-wider bg-white/10 backdrop-blur-md/5 sticky top-0 z-10 border-b border-[#a7c4bc]/30">
              <tr>
                <th className="px-6 py-4 font-medium">Famille</th>
                <th className="px-6 py-4 font-medium">Parent</th>
                <th className="px-6 py-4 font-medium">Ville</th>
                <th className="px-6 py-4 font-medium">Enfants</th>
                <th className="px-6 py-4 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a7c4bc]/10 bg-white/10 backdrop-blur-md">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#a7c4bc]/70">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#a7c4bc]/70">
                  {search ? 'Aucun résultat.' : 'Aucune famille enregistrée.'}
                </td></tr>
              ) : (
                filtered.map((family) => (
                  <tr key={family.id} className="hover:bg-white/10 backdrop-blur-md/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#F7F5F2]">{family.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#F7F5F2]">
                        {family.profiles?.first_name} {family.profiles?.last_name}
                      </div>
                      <div className="text-xs text-[#a7c4bc] mt-0.5">{family.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]">
                      {family.city ?? '—'}{family.province ? `, ${family.province}` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#a7c4bc]/20 text-[#F7F5F2] border border-[#a7c4bc]/30">
                        {family.children?.length ?? 0} enfant{(family.children?.length ?? 0) > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]">
                      {new Date(family.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
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
