'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

const NAV_ITEMS = [
  { href: '/parent/dashboard', label: 'Tableau de bord', icon: '🏠' },
  { href: '/parent/children', label: 'Mes Enfants', icon: '👶' },
  { href: '/parent/sessions', label: 'Séances 20 min', icon: '⏱️' },
  { href: '/parent/reports', label: 'Rapports', icon: '📊' },
  { href: '/parent/program', label: 'Programme', icon: '🏆' },
  { href: '/parent/messages', label: 'Messages', icon: '💬' },
  { href: '/parent/profile', label: 'Mon Profil', icon: '👤' },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role && !['PARENT'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brand-primary">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col fixed h-full z-20 shadow-sm">
        {/* Logo Area */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-sm shadow-md">
              T
            </div>
            <div>
              <p className="text-sm font-bold text-brand-primary tracking-tight">THRIVE</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mt-0.5">Espace Parent</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/parent/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-brand-primary text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-brand-tertiary/20 hover:text-brand-primary font-medium'
                }`}
              >
                <span className="text-base opacity-80">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xs font-bold border border-gray-200">
                {user.firstName?.[0] || 'P'}{user.lastName?.[0] || ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.firstName || 'Parent'} {user.lastName || ''}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full py-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[260px] flex-1 p-10 max-w-[1400px]">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
