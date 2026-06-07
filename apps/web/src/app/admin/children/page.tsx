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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Enfants 🧒</h1>
          <p className="text-gray-500 mt-1">{children.length} enfant{children.length > 1 ? 's' : ''} enregistré{children.length > 1 ? 's' : ''}</p>
        </div>
        <input
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm w-64"
          placeholder="Rechercher un enfant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-400 text-sm">
              <th className="px-6 py-4">Enfant</th>
              <th className="px-6 py-4">Famille</th>
              <th className="px-6 py-4">Âge</th>
              <th className="px-6 py-4">Programmes</th>
              <th className="px-6 py-4">Badges</th>
              <th className="px-6 py-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                {search ? 'Aucun résultat.' : 'Aucun enfant enregistré.'}
              </td></tr>
            ) : (
              filtered.map((child) => (
                <tr key={child.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{child.first_name} {child.last_name}</p>
                    {child.gender && <p className="text-xs text-gray-400">{child.gender}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{child.families?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">{calculateAge(child.date_of_birth)} ans</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {child.program_enrollments?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-yellow-100 text-yellow-700 rounded-full px-3 py-1 text-xs font-semibold">
                      🏅 {child.child_badges?.length ?? 0}
                    </span>
                  </td>
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
