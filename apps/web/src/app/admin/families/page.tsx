'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Familles 👨‍👩‍👧‍👦</h1>
          <p className="text-gray-500 mt-1">{families.length} famille{families.length > 1 ? 's' : ''} enregistrée{families.length > 1 ? 's' : ''}</p>
        </div>
        <input
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm w-64"
          placeholder="Rechercher une famille..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-sm">
              <th className="px-6 py-4">Famille</th>
              <th className="px-6 py-4">Parent</th>
              <th className="px-6 py-4">Ville</th>
              <th className="px-6 py-4">Enfants</th>
              <th className="px-6 py-4">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                {search ? 'Aucun résultat.' : 'Aucune famille enregistrée.'}
              </td></tr>
            ) : (
              filtered.map((family) => (
                <tr key={family.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{family.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">
                      {family.profiles?.first_name} {family.profiles?.last_name}
                    </p>
                    <p className="text-xs text-gray-400">{family.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {family.city ?? '—'}{family.province ? `, ${family.province}` : ''}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 rounded-full px-3 py-1 text-xs font-semibold">
                      {family.children?.length ?? 0} enfant{(family.children?.length ?? 0) > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(family.created_at).toLocaleDateString('fr-CA')}
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
