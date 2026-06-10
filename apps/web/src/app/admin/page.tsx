'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalParents:    number;
  totalFamilies:   number;
  totalChildren:   number;
  totalCoaches:    number;
  totalPrograms:   number;
  activePrograms:  number;
  totalSessions:   number;
  completedSessions: number;
  recentSignups: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    registration_status: string | null;
    created_at: string;
  }[];
}

const ROLE_STYLE: Record<string, string> = {
  PARENT:      'bg-blue-100 text-blue-700',
  COACH:       'bg-purple-100 text-purple-700',
  ADMIN:       'bg-rose-100 text-rose-700',
  SUPER_ADMIN: 'bg-slate-800 text-white',
};

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ── Composant ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const [
      parentsRes,
      familiesRes,
      childrenRes,
      coachesRes,
      programsRes,
      sessionsRes,
      recentRes,
    ] = await Promise.all([
      // Tous les comptes PARENT (qu'ils aient ou non une famille)
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'PARENT'),
      // Familles créées
      supabase.from('families').select('id', { count: 'exact', head: true }),
      // Enfants actifs
      supabase.from('children').select('id', { count: 'exact', head: true }).eq('is_active', true),
      // Coaches
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'COACH'),
      // Programmes
      supabase.from('programs').select('id, status'),
      // Séances
      supabase.from('sessions').select('id, status'),
      // Inscriptions récentes (tous rôles, 8 derniers)
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, registration_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    setStats({
      totalParents:      parentsRes.count    ?? 0,
      totalFamilies:     familiesRes.count   ?? 0,
      totalChildren:     childrenRes.count   ?? 0,
      totalCoaches:      coachesRes.count    ?? 0,
      totalPrograms:     programsRes.data?.length ?? 0,
      activePrograms:    (programsRes.data ?? []).filter((p) => p.status === 'ACTIVE').length,
      totalSessions:     sessionsRes.data?.length ?? 0,
      completedSessions: (sessionsRes.data ?? []).filter((s) => s.status === 'COMPLETED').length,
      recentSignups:     recentRes.data ?? [],
    });
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Realtime — toutes les tables clés
  useEffect(() => {
    const ch = supabase
      .channel('admin-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },  fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' },  fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' },  fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' },  fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' },  fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchStats]);

  // Skeleton pendant le chargement
  if (isLoading) return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-10 bg-gray-100 rounded-2xl w-48 mb-3" />
      <div className="h-5  bg-gray-100 rounded-xl  w-72 mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[24px] p-6 h-36 shadow-sm border border-slate-100" />
        ))}
      </div>
    </div>
  );

  if (!stats) return null;

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Parents inscrits',  value: stats.totalParents,    icon: '👨‍👩‍👧‍👦', href: '/admin/families', gradient: 'from-blue-500 to-cyan-500',      shadow: 'shadow-blue-500/20'    },
    { label: 'Familles créées',  value: stats.totalFamilies,   icon: '🏠',           href: '/admin/families', gradient: 'from-indigo-500 to-blue-500',   shadow: 'shadow-indigo-500/20'  },
    { label: 'Enfants actifs',    value: stats.totalChildren,   icon: '🧒',           href: '/admin/children', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Coaches',           value: stats.totalCoaches,    icon: '🎯',           href: '/admin/coaches',  gradient: 'from-purple-500 to-fuchsia-500',shadow: 'shadow-purple-500/20'  },
    { label: 'Programmes',        value: stats.totalPrograms,   icon: '🏆',           href: '/admin/programs', gradient: 'from-amber-500 to-orange-500',  shadow: 'shadow-amber-500/20'   },
    { label: 'Programmes actifs', value: stats.activePrograms,  icon: '▶️',           href: '/admin/programs', gradient: 'from-rose-500 to-pink-500',    shadow: 'shadow-rose-500/20'    },
    { label: 'Séances totales',  value: stats.totalSessions,   icon: '📅',           href: '#',               gradient: 'from-slate-600 to-slate-800',  shadow: 'shadow-slate-500/20'   },
    { label: 'Taux completion',   value: `${completionRate}%`,  icon: '📊',           href: '/admin/analytics',gradient: 'from-lime-500 to-green-600',   shadow: 'shadow-lime-500/20'    },
  ];

  return (
    <div className="max-w-7xl mx-auto">

      {/* En-tête */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Dashboard</h1>
          <p className="text-slate-500 font-medium">Vue globale de la plateforme THRIVE — mise à jour en temps réel</p>
        </div>
        {/* Indicateur Realtime */}
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Grille KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="group outline-none">
            <div className={`relative overflow-hidden bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 hover:border-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${card.shadow}`}>
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Inscriptions récentes</h2>
            <Link href="/admin/families" className="text-sm text-blue-600 hover:underline font-medium">
              Voir tous →
            </Link>
          </div>

          {stats.recentSignups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">👋</p>
              <p className="text-slate-400 font-medium">Aucune inscription pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4 px-4">Utilisateur</th>
                    <th className="pb-4 px-4">Rôle</th>
                    <th className="pb-4 px-4">Statut</th>
                    <th className="pb-4 px-4 text-right">Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSignups.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      {/* Avatar + nom */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email}
                            </p>
                            {user.first_name && (
                              <p className="text-xs text-slate-400">{user.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Rôle */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          ROLE_STYLE[user.role] ?? 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      {/* Statut */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          STATUS_STYLE[user.registration_status ?? ''] ?? 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.registration_status ?? '—'}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="py-4 px-4 text-right text-slate-500 text-sm font-medium">
                        {new Date(user.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
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
