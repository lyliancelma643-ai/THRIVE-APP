'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore, logout } from '@/stores/auth.store';
import { getMfaStatus } from '@/lib/mfa';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';

type NavItem = { href: string; label: string; icon: IconName; superAdminOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/dossiers', label: 'Dossiers', icon: 'folder' },
  { href: '/admin/supervision', label: 'Supervision', icon: 'compass', superAdminOnly: true },
  { href: '/admin/users', label: 'Comptes', icon: 'user' },
  { href: '/admin/coaches', label: 'Coaches', icon: 'target' },
  { href: '/admin/families', label: 'Familles', icon: 'users' },
  { href: '/admin/children', label: 'Enfants', icon: 'child' },
  { href: '/admin/assignments', label: 'Assignations', icon: 'link' },
  { href: '/admin/programs', label: 'Programmes', icon: 'trophy' },
  { href: '/admin/questionnaires', label: 'Questionnaires', icon: 'clipboard' },
  { href: '/admin/badges', label: 'Badges', icon: 'award' },
  { href: '/admin/messages', label: 'Messages', icon: 'message' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/settings/security', label: 'Sécurité', icon: 'lock' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Enforcement MFA sur la zone admin : si l'utilisateur a un facteur TOTP
  // enrôlé mais une session encore en aal1, on exige le step-up avant l'accès.
  // DORMANT tant qu'aucun facteur n'est enrôlé (needsStepUp reste false) →
  // aucun risque de verrouiller les comptes actuels.
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;
    let cancelled = false;
    getMfaStatus().then((s) => {
      if (!cancelled && s.needsStepUp) {
        router.replace('/mfa-verify?next=' + encodeURIComponent(pathname));
      }
    });
    return () => { cancelled = true; };
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4" role="status" aria-label="Chargement">
          <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-navy-600/60 text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  const navItems = NAV_ITEMS.filter((i) => !i.superAdminOnly || user.role === 'SUPER_ADMIN');

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Barre mobile : logo + navigation horizontale défilante */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-20 bg-navy-900 text-white safe-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="flex items-center gap-2"><BrandLogo className="w-7 h-7" /> <span className="text-navy-200/70 text-xs">Admin</span></p>
          <button
            onClick={() => logout()}
            className="text-xs text-navy-200/70 hover:text-white min-h-[44px] px-2 -mr-2 transition-colors"
          >
            Quitter
          </button>
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide overscroll-x-contain">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-full text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-white text-navy-900 font-semibold' : 'text-navy-100/80 bg-navy-800'
                }`}
              >
                <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="hidden lg:flex w-64 bg-navy-900 text-white flex-col fixed h-full z-10">
        <div className="p-6 border-b border-navy-800">
          <BrandLogo className="w-10 h-10 shadow-card" />
          <p className="text-navy-200/70 text-xs mt-2">Espace Admin</p>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-white text-navy-900 font-semibold'
                    : 'text-navy-100/70 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-navy-800">
          <div className="px-4 py-3 mb-2">
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-navy-200/70">{user.role}</p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full text-left px-4 py-2.5 min-h-[44px] text-navy-100/70 hover:text-white text-sm rounded-xl hover:bg-navy-800 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 pt-[calc(7rem+env(safe-area-inset-top))] md:p-6 md:pt-[calc(7rem+env(safe-area-inset-top))] lg:ml-64 lg:p-8 lg:pt-8 min-w-0">{children}</main>
    </div>
  );
}
