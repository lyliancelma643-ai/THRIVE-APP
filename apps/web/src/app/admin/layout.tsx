'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/coaches', label: 'Coaches', icon: '🎯' },
  { href: '/admin/families', label: 'Familles', icon: '👨‍👩‍👧‍👦' },
  { href: '/admin/children', label: 'Enfants', icon: '🧒' },
  { href: '/admin/programs', label: 'Programmes', icon: '🏆' },
  { href: '/admin/questionnaires', label: 'Questionnaires', icon: '📝' },
  { href: '/admin/badges', label: 'Badges', icon: '🏅' },
  { href: '/admin/messages', label: 'Messages', icon: '💬' },
  { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-black text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-800">
          <p className="text-xl font-bold">THRIVE</p>
          <p className="text-gray-400 text-xs mt-1">Espace Admin</p>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="px-4 py-3 mb-2">
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
          <button
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="w-full text-left px-4 py-2 text-gray-400 hover:text-white text-sm rounded-xl hover:bg-gray-800"
          >
            🚪 Se déconnecter
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
