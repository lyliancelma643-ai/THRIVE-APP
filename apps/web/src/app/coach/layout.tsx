'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';

const NAV_ITEMS = [
  { href: '/coach/dashboard', label: 'Tableau de bord', icon: '⌂' },
  { href: '/coach/sessions', label: 'Séances', icon: '✓' },
  { href: '/coach/athletes', label: 'Mes athlètes', icon: '★' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

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
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-900 text-white">
        <span className="flex items-center gap-2">
          <BrandLogo className="h-7 w-auto" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-sage">Coach</span>
        </span>
        <button
          onClick={async () => {
            await signOut();
            router.push('/login');
          }}
          className="text-xs text-navy-200/80"
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
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? 'text-sun' : 'text-navy-100/70'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex-col z-40">
        <div className="px-6 pt-8 pb-6">
          <Link href="/coach/dashboard" className="block">
            <BrandLogo className="h-10 w-auto" />
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
                <span className="w-5 text-center text-base">{item.icon}</span>
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
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className="text-xs text-navy-200/80 hover:text-sun transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="px-4 py-5 pb-24 md:px-8 lg:ml-64 lg:px-10 lg:py-8 lg:pb-8">{children}</main>
    </div>
  );
}
