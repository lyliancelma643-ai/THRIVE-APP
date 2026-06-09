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
        // casing flexible : on compte coach ET COACH
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['coach', 'COACH']),
        supabase.from('programs').select('id, status', { count: 'exact' }),
        supabase.from('sessions').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('email, role, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalFamilies: families.count ?? 0,
        totalChildren: children.count ?? 0,
        totalCoaches: coaches.count ?? 0,
        totalPrograms: programs.count ?? 0,
        activePrograms: (programs.data ?? []).filter((p) => p.status === 'ACTIVE' || p.status === 'active').length,
        totalSessions: sessions.count ?? 0,
        completedSessions: (sessions.data ?? []).filter((s) => s.status === 'COMPLETED' || s.status === 'completed').length,
        recentSignups: recent.data ?? [],
      });
      setIsLoading(false);
    };

    fetchStats();

    // ── Realtime : actualisation automatique quand un nouveau profil ou famille est créé ──
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'families' }, () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'children' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      <div className="mb-10 border-b border-[#a7c4bc]/20 pb-6">
        <h1 className="text-3xl font-extrabold text-[#F7F5F2] mb-2 tracking-tight">Dashboard</h1>
        <p className="text-[#a7c4bc] text-base font-medium">Vue globale de la plateforme THRIVE</p>
      </div>

      {/* Section: Utilisateurs */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-[#a7c4bc] rounded-full shadow-[0_0_8px_rgba(167,196,188,0.5)]"></div>
          <h2 className="text-lg font-bold text-[#F7F5F2]">Communauté</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: 'Familles', value: stats.totalFamilies, href: '/admin/families' },
            { label: 'Enfants actifs', value: stats.totalChildren, href: '/admin/children' },
            { label: 'Coaches', value: stats.totalCoaches, href: '/admin/coaches' },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="group outline-none block">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-[#a7c4bc]/20 hover:border-[#a7c4bc]/50 hover:bg-white/15 shadow-xl transition-all h-full">
                <p className="text-[#a7c4bc] text-xs font-bold mb-2 uppercase tracking-widest opacity-80">{card.label}</p>
                <p className="text-4xl font-extrabold text-[#F7F5F2]">{card.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Section: Programmes */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-[#a7c4bc] rounded-full shadow-[0_0_8px_rgba(167,196,188,0.5)]"></div>
          <h2 className="text-lg font-bold text-[#F7F5F2]">Programmes & Séances</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {[
            { label: 'Programmes', value: stats.totalPrograms, href: '/admin/programs' },
            { label: 'Progs. Actifs', value: stats.activePrograms, href: '/admin/programs' },
            { label: 'Séances Tot.', value: stats.totalSessions, href: '#' },
            { label: 'Séances Term.', value: stats.completedSessions, href: '#' },
            { label: 'Taux Compl.', value: `${completionRate}%`, href: '#' },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="group outline-none block">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-[#a7c4bc]/20 hover:border-[#a7c4bc]/50 hover:bg-white/15 shadow-xl transition-all h-full flex flex-col justify-between">
                <p className="text-[#a7c4bc] text-[11px] font-bold mb-3 uppercase tracking-widest opacity-80">{card.label}</p>
                <p className="text-3xl font-extrabold text-[#F7F5F2]">{card.value}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Inscriptions récentes */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-[#a7c4bc] rounded-full shadow-[0_0_8px_rgba(167,196,188,0.5)]"></div>
          <h2 className="text-lg font-bold text-[#F7F5F2]">Inscriptions récentes</h2>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-[#a7c4bc]/20 overflow-hidden shadow-2xl">
          {stats.recentSignups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#a7c4bc] text-sm">Aucune inscription pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-[#a7c4bc] text-xs uppercase tracking-widest border-b border-[#a7c4bc]/20">
                  <tr>
                    <th className="font-bold px-6 py-5 text-left">Utilisateur</th>
                    <th className="font-bold px-6 py-5 text-left">Rôle</th>
                    <th className="font-bold px-6 py-5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a7c4bc]/10">
                  {stats.recentSignups.map((user, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-5 font-semibold text-[#F7F5F2]">
                        {user.email}
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-white/10 text-[#a7c4bc] border border-[#a7c4bc]/30">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right text-[#a7c4bc]/80 font-medium">
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
