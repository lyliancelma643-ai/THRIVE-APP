'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import Link from 'next/link';
import { IncompleteBanner } from '@/components/coach/IncompleteBanner';
import { Badge, Icon, type IconName } from '@/components/ui';

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

type BadgeTone = 'navy' | 'sage' | 'sun' | 'success' | 'warning' | 'danger' | 'neutral';

const ROLE_TONE: Record<string, BadgeTone> = {
  PARENT:      'navy',
  COACH:       'sage',
  ADMIN:       'danger',
  SUPER_ADMIN: 'sun',
};

const STATUS_TONE: Record<string, BadgeTone> = {
  pending:  'warning',
  approved: 'success',
  rejected: 'danger',
};

// Compte les lignes sans les rapatrier (head:true) — scalable à des milliers de séances.
async function countRows(table: string, filters: Record<string, unknown> = {}): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
  const { count } = await q;
  return count ?? 0;
}

// ── Composant ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const [
      totalParents,
      totalFamilies,
      totalChildren,
      totalCoaches,
      totalPrograms,
      activePrograms,
      totalSessions,
      completedSessions,
      recentRes,
    ] = await Promise.all([
      countRows('profiles', { role: 'PARENT' }),
      countRows('families'),
      countRows('children', { is_active: true }),
      countRows('profiles', { role: 'COACH' }),
      countRows('programs'),
      countRows('programs', { status: 'ACTIVE' }),
      countRows('sessions'),
      countRows('sessions', { status: 'COMPLETED' }),
      // Inscriptions récentes (tous rôles, 8 derniers)
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, registration_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    setStats({
      totalParents,
      totalFamilies,
      totalChildren,
      totalCoaches,
      totalPrograms,
      activePrograms,
      totalSessions,
      completedSessions,
      recentSignups: recentRes.data ?? [],
    });
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Realtime — toutes les tables clés. Un refetch débouncé (400 ms) évite la
  // rafale de requêtes quand plusieurs lignes changent d'un coup (import, batch).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fetchStats(); }, 400);
    };
    const ch = supabase
      .channel('admin-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' },  schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' },  schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' },  schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' },  schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' },  schedule)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
  }, [fetchStats]);

  // Skeleton pendant le chargement
  if (isLoading) return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-10 bg-navy-100/60 rounded-2xl w-48 mb-3" />
      <div className="h-5  bg-navy-100/60 rounded-xl  w-72 mb-10" />
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 h-36 shadow-card" />
        ))}
      </div>
    </div>
  );

  if (!stats) return null;

  const completionRate = stats.totalSessions > 0
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  const STAT_CARDS: { label: string; value: number | string; icon: IconName; href: string; accent: string }[] = [
    { label: 'Parents inscrits',  value: stats.totalParents,   icon: 'user',      href: '/admin/families', accent: 'bg-navy-600 text-white'  },
    { label: 'Familles créées',   value: stats.totalFamilies,  icon: 'users',     href: '/admin/families', accent: 'bg-sage text-navy-900'   },
    { label: 'Enfants actifs',    value: stats.totalChildren,  icon: 'child',     href: '/admin/children', accent: 'bg-sun text-navy-900'    },
    { label: 'Coaches',           value: stats.totalCoaches,   icon: 'target',    href: '/admin/coaches',  accent: 'bg-navy-100 text-navy-700' },
    { label: 'Programmes',        value: stats.totalPrograms,  icon: 'trophy',    href: '/admin/programs', accent: 'bg-navy-600 text-white'  },
    { label: 'Programmes actifs', value: stats.activePrograms, icon: 'check',     href: '/admin/programs', accent: 'bg-sage text-navy-900'   },
    { label: 'Séances totales',   value: stats.totalSessions,  icon: 'clipboard', href: '/admin/analytics', accent: 'bg-navy-100 text-navy-700' },
    { label: 'Taux complétion',   value: `${completionRate}%`, icon: 'chart',     href: '/admin/analytics', accent: 'bg-sun text-navy-900'    },
  ];

  return (
    <div className="max-w-7xl mx-auto">

      {/* En-tête */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-navy-900 tracking-tight mb-2">Dashboard</h1>
          <p className="text-navy-600/70 font-medium">Vue globale de la plateforme THRIVE — mise à jour en temps réel</p>
        </div>
        {/* Indicateur Realtime */}
        <div className="flex items-center gap-2 text-sm text-navy-700 font-semibold bg-sage-light px-4 py-2 rounded-full shrink-0">
          <span className="w-2 h-2 rounded-full bg-sage-dark animate-pulse" />
          <span className="hidden sm:inline">Temps réel</span>
        </div>
      </div>

      <IncompleteBanner href="/admin/dossiers" />

      {/* Grille KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="group outline-none">
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
              <div className={`w-12 h-12 rounded-2xl ${card.accent} flex items-center justify-center mb-4 transform group-hover:scale-105 transition-transform duration-300`}>
                <Icon name={card.icon} className="w-6 h-6" />
              </div>
              <p className="font-display text-3xl md:text-4xl font-semibold text-navy-900 tracking-tight mb-1">{card.value}</p>
              <p className="text-navy-600/70 font-medium text-sm">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Inscriptions récentes */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold text-navy-900">Inscriptions récentes</h2>
          <Link href="/admin/families" className="text-sm text-navy-600 hover:text-navy-900 font-medium">
            Voir tous →
          </Link>
        </div>

        {stats.recentSignups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-navy-600/50 font-medium">Aucune inscription pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <caption className="sr-only">Dernières inscriptions à la plateforme</caption>
              <thead>
                <tr className="text-left text-navy-500 text-xs font-semibold uppercase tracking-wider border-b border-navy-100">
                  <th scope="col" className="pb-4 px-4">Utilisateur</th>
                  <th scope="col" className="pb-4 px-4">Rôle</th>
                  <th scope="col" className="pb-4 px-4">Statut</th>
                  <th scope="col" className="pb-4 px-4 text-right">Inscription</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((user) => (
                  <tr key={user.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50 transition-colors">
                    {/* Avatar + nom */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </p>
                          {user.first_name && (
                            <p className="text-xs text-navy-500">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Rôle */}
                    <td className="py-4 px-4">
                      <Badge tone={ROLE_TONE[user.role] ?? 'neutral'}>{user.role}</Badge>
                    </td>
                    {/* Statut */}
                    <td className="py-4 px-4">
                      <Badge tone={STATUS_TONE[user.registration_status ?? ''] ?? 'neutral'}>
                        {user.registration_status ?? '—'}
                      </Badge>
                    </td>
                    {/* Date */}
                    <td className="py-4 px-4 text-right text-navy-500 text-sm font-medium">
                      {new Date(user.created_at).toLocaleDateString('fr-CA', {
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
  );
}
