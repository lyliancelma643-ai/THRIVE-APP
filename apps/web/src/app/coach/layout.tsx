'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, logout } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: '/coach/dashboard', label: 'Tableau de bord', icon: 'home' },
  { href: '/coach/sessions', label: 'Séances', icon: 'check' },
  { href: '/coach/athletes', label: 'Mes athlètes', icon: 'star' },
  { href: '/coach/bilan', label: 'Bilans', icon: 'sparkle' },
  { href: '/coach/dossiers', label: 'Suivi', icon: 'pie' },
  { href: '/coach/messages', label: 'Messages', icon: 'mail' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role && !['COACH', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Mini-barre mobile */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-900 text-white safe-top">
        <span className="flex items-center gap-2">
          <BrandLogo className="w-7 h-7" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-sage">Coach</span>
        </span>
        <button
          onClick={() => logout()}
          className="text-xs text-navy-200/80 hover:text-white min-h-[44px] px-2 -mr-2 transition-colors"
        >
          Quitter
        </button>
      </div>

      {/* Barre d'onglets mobile (en bas, comme une app) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex bg-navy-900/95 backdrop-blur-xl border-t border-navy-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 font-medium transition-colors ${
                active ? 'text-sun' : 'text-navy-100/70'
              }`}
            >
              <Icon name={item.icon} className="w-[22px] h-[22px] shrink-0" />
              {/* Hauteur de 2 lignes réservée : les libellés longs (« Tableau de
                  bord », « Mes athlètes ») s'alignent avec les courts sur mobile. */}
              <span className="min-h-[26px] flex items-center text-center text-[11px] leading-[1.05] px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex-col z-40">
        <div className="px-6 pt-8 pb-6">
          <Link href="/coach/dashboard" className="block">
            <BrandLogo className="w-10 h-10 shadow-card" />
            <span className="block text-[11px] uppercase tracking-[0.2em] text-sage mt-2">
              Espace coach
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-navy-600 text-white'
                    : 'text-navy-100/80 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-navy-800">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-navy-200/60 truncate mb-3">{user.email}</p>
          <button
            onClick={() => logout()}
            className="text-xs text-navy-200/80 hover:text-sun transition-colors min-h-[44px] px-2 -mx-2"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="px-4 py-5 pb-24 md:px-8 lg:ml-64 lg:px-10 lg:py-8 lg:pb-8">{children}</main>
    </div>
  );
}
