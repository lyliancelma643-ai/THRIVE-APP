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
  { href: '/admin/content', label: 'Contenu', icon: '📚' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    const role = user?.role?.toUpperCase();
    if (role && !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#004e7a]">
        <div className="w-8 h-8 border-2 border-[#F7F5F2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#004e7a] to-[#002f4a] text-[#F7F5F2] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#a7c4bc]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#a7c4bc]/10 blur-[120px] pointer-events-none" />

      {/* Sidebar Minimaliste & Glassmorphism */}
      <aside className="w-[260px] bg-white/5 backdrop-blur-md border-r border-[#a7c4bc]/20 flex flex-col fixed h-full z-20 shadow-2xl">
        {/* Logo Area */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              🏆
            </div>
            <div>
              <p className="text-lg font-bold text-white tracking-tight">THRIVE</p>
              <p className="text-[#a7c4bc] text-[10px] uppercase tracking-widest font-medium mt-0.5">Espace Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm ${
                  isActive 
                    ? 'bg-white/10 border border-white/10 text-white font-semibold shadow-md' 
                    : 'text-[#F7F5F2]/70 hover:bg-white/5 hover:text-white font-medium'
                }`}
              >
                <span className={`text-lg ${isActive ? 'text-[#a7c4bc]' : 'opacity-70'}`}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Area */}
        <div className="p-4 border-t border-[#a7c4bc]/20 bg-black/10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-[#a7c4bc]/20 flex items-center justify-center text-[#a7c4bc] text-xs font-bold border border-[#a7c4bc]/30 shadow-sm">
                {user.firstName?.[0] || 'A'}{user.lastName?.[0] || ''}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.firstName || 'Admin'} {user.lastName || ''}</p>
                <p className="text-[11px] text-[#a7c4bc] truncate uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full py-2.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-[#F7F5F2]/80 hover:text-red-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[260px] flex-1 p-10 max-w-[1400px] z-10">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
