'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

const NAV_ITEMS = [
  { href: '/parent/dashboard', label: 'Accueil' },
  { href: '/parent/children', label: 'Mon Enfant' },
  { href: '/parent/programs', label: 'Programmes' },
  { href: '/parent/sessions', label: 'Séances' },
  { href: '/parent/messages', label: 'Messages' },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSelectProfile = pathname === '/parent/select-profile';
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    const role = user?.role?.toUpperCase();
    if (role && !['PARENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#004e7a' }}>
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isSelectProfile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#04111d' }}>

      {/* ── NAVBAR HORIZONTALE (style Netflix) ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 h-16"
        style={{
          background: 'linear-gradient(to bottom, rgba(4,17,29,0.95) 0%, rgba(4,17,29,0.0) 100%)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link href="/parent/dashboard">
            <span className="font-black text-2xl tracking-tight" style={{ color: '#F7F5F2' }}>
              THRIVE<span style={{ color: '#a7c4bc' }}>.</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/parent/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: isActive ? '#F7F5F2' : 'rgba(247,245,242,0.55)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F7F5F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? '#F7F5F2' : 'rgba(247,245,242,0.55)')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profil + déconnexion */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: '#1a6fa8', color: '#F7F5F2' }}
            >
              {user.firstName?.[0]?.toUpperCase() || 'P'}
            </div>
            <span className="text-sm font-medium hidden md:block" style={{ color: 'rgba(247,245,242,0.80)' }}>
              {user.firstName || 'Parent'}
            </span>
          </div>
          <button
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
            style={{ color: 'rgba(247,245,242,0.5)', border: '1px solid rgba(247,245,242,0.15)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F7F5F2';
              e.currentTarget.style.borderColor = 'rgba(247,245,242,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(247,245,242,0.5)';
              e.currentTarget.style.borderColor = 'rgba(247,245,242,0.15)';
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── CONTENU PRINCIPAL ── */}
      <main className="flex-1 pt-16">
        {children}
      </main>

    </div>
  );
}
