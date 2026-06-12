'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

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
      <aside className="fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex flex-col z-40">
        <div className="px-6 pt-8 pb-6">
          <Link href="/coach/dashboard" className="block">
            <span className="font-display text-2xl font-semibold tracking-wide">
              THRIVE<span className="text-sun">↑</span>
            </span>
            <span className="block text-[11px] uppercase tracking-[0.2em] text-sage mt-1">
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

      <main className="ml-64 px-10 py-8">{children}</main>
    </div>
  );
}
