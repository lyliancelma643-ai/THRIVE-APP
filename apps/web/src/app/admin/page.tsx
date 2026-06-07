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

  if (isLoading) return <div className="text-gray-400">Chargement des statistiques...</div>;
  if (!stats) return null;

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Familles', value: stats.totalFamilies, icon: '👨‍👩‍👧‍👦', href: '/admin/families', color: 'bg-blue-50' },
    { label: 'Enfants actifs', value: stats.totalChildren, icon: '🧒', href: '/admin/children', color: 'bg-green-50' },
    { label: 'Coaches', value: stats.totalCoaches, icon: '🎯', href: '/admin/coaches', color: 'bg-purple-50' },
    { label: 'Programmes', value: stats.totalPrograms, icon: '🏆', href: '/admin/programs', color: 'bg-yellow-50' },
    { label: 'Programmes actifs', value: stats.activePrograms, icon: '▶️', href: '/admin/programs', color: 'bg-orange-50' },
    { label: 'Séances totales', value: stats.totalSessions, icon: '📅', href: '#', color: 'bg-gray-50' },
    { label: 'Séances terminées', value: stats.completedSessions, icon: '✅', href: '#', color: 'bg-emerald-50' },
    { label: 'Taux completion', value: `${completionRate}%`, icon: '📊', href: '#', color: 'bg-indigo-50' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Dashboard Admin 📊</h1>
      <p className="text-gray-500 mb-8">Vue globale de la plateforme THRIVE</p>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-5 mb-10">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className={`${card.color} rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer`}>
              <p className="text-3xl mb-2">{card.icon}</p>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-gray-600 text-sm mt-1">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Inscriptions récentes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Inscriptions récentes</h2>
        {stats.recentSignups.length === 0 ? (
          <p className="text-gray-400">Aucune inscription.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b">
                <th className="pb-3">Email</th>
                <th className="pb-3">Rôle</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSignups.map((user, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 text-sm font-medium">{user.email}</td>
                  <td className="py-3">
                    <span className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-semibold">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString('fr-CA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
