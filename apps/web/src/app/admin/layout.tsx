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
    if (user?.role && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar Premium */}
      <aside className="w-[280px] bg-[#0B0F19] text-slate-300 flex flex-col fixed h-full z-20 shadow-2xl">
        {/* Logo Area */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
              T
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-wide">THRIVE</p>
              <p className="text-blue-400 text-xs font-medium tracking-widest uppercase mt-0.5">Espace Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'text-white bg-white/10 shadow-sm border border-white/5' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] rounded-r-full" />
                )}
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className={`font-medium ${isActive ? 'tracking-wide' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Area */}
        <div className="p-5 border-t border-white/5 bg-white/[0.02]">
          <div className="bg-[#151A27] rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-indigo-400 font-medium truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>🚪</span> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[280px] flex-1 p-10 max-w-[1600px] mx-auto w-full">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {children}
        </div>
      </main>
    </div>
  );
}
