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
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!stats) return null;

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Familles', value: stats.totalFamilies, icon: '👨‍👩‍👧‍👦', href: '/admin/families', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
    { label: 'Enfants actifs', value: stats.totalChildren, icon: '🧒', href: '/admin/children', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Coaches', value: stats.totalCoaches, icon: '🎯', href: '/admin/coaches', gradient: 'from-purple-500 to-fuchsia-500', shadow: 'shadow-purple-500/20' },
    { label: 'Programmes', value: stats.totalPrograms, icon: '🏆', href: '/admin/programs', gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    { label: 'Programmes actifs', value: stats.activePrograms, icon: '▶️', href: '/admin/programs', gradient: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-500/20' },
    { label: 'Séances totales', value: stats.totalSessions, icon: '📅', href: '#', gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/20' },
    { label: 'Séances terminées', value: stats.completedSessions, icon: '✅', href: '#', gradient: 'from-lime-500 to-green-600', shadow: 'shadow-lime-500/20' },
    { label: 'Taux completion', value: `${completionRate}%`, icon: '📊', href: '#', gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-500/20' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Dashboard</h1>
        <p className="text-slate-500 font-medium">Vue globale de la plateforme THRIVE</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="group outline-none">
            <div className={`relative overflow-hidden bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 hover:border-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.shadow}`}>
              {/* Decorative gradient background that reveals on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-2xl shadow-lg ${card.shadow} transform group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900 tracking-tight mb-1">{card.value}</p>
              <p className="text-slate-500 font-medium text-sm">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Inscriptions récentes */}
      <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Subtle decorative blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Inscriptions récentes</h2>
          {stats.recentSignups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-medium">Aucune inscription pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-sm font-semibold border-b border-slate-100">
                    <th className="pb-4 px-4">Utilisateur</th>
                    <th className="pb-4 px-4">Rôle</th>
                    <th className="pb-4 px-4 text-right">Date d'inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSignups.map((user, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                            {user.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === 'COACH' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'PARENT' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-500 text-sm font-medium">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
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
