'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import Link from 'next/link';

interface AdminStats {
  totalFamilies: number;
  totalChildren: number;
  totalCoaches: number;
  totalPrograms: number;
  activePrograms: number;
  totalSessions: number;
  completedSessions: number;
  recentSignups: { email: string; created_at: string; role: string }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [families, children, coaches, programs, sessions, recent] = await Promise.all([
        supabase.from('families').select('id', { count: 'exact', head: true }),
        supabase.from('children').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'COACH'),
        supabase.from('programs').select('id, status', { count: 'exact' }),
        supabase.from('sessions').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('email, role, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalFamilies: families.count ?? 0,
        totalChildren: children.count ?? 0,
        totalCoaches: coaches.count ?? 0,
        totalPrograms: programs.count ?? 0,
        activePrograms: (programs.data ?? []).filter((p) => p.status === 'ACTIVE').length,
        totalSessions: sessions.count ?? 0,
        completedSessions: (sessions.data ?? []).filter((s) => s.status === 'COMPLETED').length,
        recentSignups: recent.data ?? [],
      });
      setIsLoading(false);
    };
    fetchStats();
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!stats) return null;

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Familles', value: stats.totalFamilies, href: '/admin/families' },
    { label: 'Enfants actifs', value: stats.totalChildren, href: '/admin/children' },
    { label: 'Coaches', value: stats.totalCoaches, href: '/admin/coaches' },
    { label: 'Programmes', value: stats.totalPrograms, href: '/admin/programs' },
    { label: 'Programmes actifs', value: stats.activePrograms, href: '/admin/programs' },
    { label: 'Séances totales', value: stats.totalSessions, href: '#' },
    { label: 'Séances terminées', value: stats.completedSessions, href: '#' },
    { label: 'Taux completion', value: `${completionRate}%`, href: '#' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 text-base">Vue globale de la plateforme THRIVE</p>
      </div>

      {/* Section: Utilisateurs */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-black rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Communauté</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Familles', value: stats.totalFamilies, href: '/admin/families' },
            { label: 'Enfants actifs', value: stats.totalChildren, href: '/admin/children' },
            { label: 'Coaches', value: stats.totalCoaches, href: '/admin/coaches' },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="group outline-none block">
              <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all">
                <p className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wider">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Section: Programmes */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-black rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Programmes & Séances</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Programmes', value: stats.totalPrograms, href: '/admin/programs' },
            { label: 'Progs. Actifs', value: stats.activePrograms, href: '/admin/programs' },
            { label: 'Séances Tot.', value: stats.totalSessions, href: '#' },
            { label: 'Séances Term.', value: stats.completedSessions, href: '#' },
            { label: 'Taux Compl.', value: `${completionRate}%`, href: '#' },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="group outline-none block">
              <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-900 hover:shadow-sm transition-all h-full flex flex-col justify-between">
                <p className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Inscriptions récentes */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-black rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Inscriptions récentes</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {stats.recentSignups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Aucune inscription pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="font-semibold px-6 py-4 text-left">Utilisateur</th>
                    <th className="font-semibold px-6 py-4 text-left">Rôle</th>
                    <th className="font-semibold px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentSignups.map((user, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
