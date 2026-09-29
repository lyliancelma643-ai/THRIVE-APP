'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, logout } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

// `short` : libellé de la barre d'onglets du téléphone et du rail iPad (une ligne).
const NAV_ITEMS: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: '/coach/dashboard', label: 'Tableau de bord', short: 'Accueil', icon: 'home' },
  { href: '/coach/sessions', label: 'Séances', short: 'Séances', icon: 'check' },
  { href: '/coach/athletes', label: 'Mes athlètes', short: 'Athlètes', icon: 'star' },
  { href: '/coach/bilan', label: 'Bilans', short: 'Bilans', icon: 'sparkle' },
  { href: '/coach/dossiers', label: 'Suivi', short: 'Suivi', icon: 'pie' },
  { href: '/coach/messages', label: 'Messages', short: 'Messages', icon: 'mail' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const unreadMessages = useUnreadMessages(isAuthenticated);

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
      <div className="min-h-dvh flex items-center justify-center bg-cream">
        <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const badge = (href: string, cls: string) =>
    href === '/coach/messages' && unreadMessages > 0 ? (
      <span className={cls} aria-label={`${unreadMessages} message(s) non lu(s)`}>
        {unreadMessages > 9 ? '9+' : unreadMessages}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh bg-cream">
      {/* Téléphone : mini-barre haute */}
      <div className="md:hidden sticky top-0 z-header flex items-center justify-between px-4 py-2 bg-navy-900 text-white safe-top">
        <span className="flex items-center gap-2">
          <BrandLogo className="w-7 h-7" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-sage">Coach</span>
        </span>
        <button
          onClick={() => logout()}
          className="text-sm text-navy-100 hover:text-white min-h-[44px] px-3 -mr-3 transition-colors"
        >
          Se déconnecter
        </button>
      </div>

      {/* Téléphone : barre d'onglets en bas (pouce), une ligne par libellé */}
      <nav
        aria-label="Navigation coach"
        className="md:hidden fixed bottom-0 inset-x-0 z-nav grid grid-cols-6 bg-navy-900/95 backdrop-blur-xl border-t border-navy-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`min-w-0 h-[60px] flex flex-col items-center justify-center gap-1 font-medium transition-colors duration-fast ${
                active ? 'text-sun' : 'text-navy-100/80'
              }`}
            >
              <span className="relative">
                <Icon name={item.icon} className="w-[22px] h-[22px] shrink-0" />
                {badge(item.href, 'absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center')}
              </span>
              <span className="max-w-full truncate text-[11px] leading-none px-0.5">{item.short}</span>
            </Link>
          );
        })}
      </nav>

      {/* iPad (768–1023 px) : rail d'icônes ; ≥ 1024 px : barre latérale complète */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-header w-[88px] lg:w-64 bg-navy-900 text-white flex-col safe-top">
        <div className="px-4 lg:px-6 pt-6 lg:pt-8 pb-5 lg:pb-6 flex justify-center lg:block">
          <Link href="/coach/dashboard" className="block" aria-label="Tableau de bord coach">
            <BrandLogo className="w-10 h-10 shadow-card" />
            <span className="hidden lg:block text-[11px] uppercase tracking-[0.2em] text-sage mt-2">
              Espace coach
            </span>
          </Link>
        </div>

        <nav aria-label="Navigation coach" className="flex-1 px-2 lg:px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-3 py-2.5 min-h-[56px] lg:min-h-[44px] rounded-xl text-[11px] lg:text-sm font-medium transition-colors duration-fast ${
                  active
                    ? 'bg-navy-600 text-white'
                    : 'text-navy-100/85 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                <span className="lg:hidden truncate max-w-full">{item.short}</span>
                <span className="hidden lg:inline">{item.label}</span>
                {badge(
                  item.href,
                  'absolute top-1.5 right-3 lg:static lg:ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center'
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 lg:px-4 py-4 lg:py-5 border-t border-navy-800">
          <div className="hidden lg:block">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-navy-200/80 truncate mb-3">{user.email}</p>
          </div>
          <button
            onClick={() => logout()}
            aria-label="Se déconnecter"
            className="w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-2 min-h-[44px] px-1 lg:px-2 lg:-mx-2 rounded-xl text-[11px] lg:text-xs text-navy-100/85 hover:text-sun hover:bg-navy-800 transition-colors"
          >
            <Icon name="power" className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="lg:hidden">Quitter</span>
            <span className="hidden lg:inline">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main className="px-4 pt-5 pb-28 md:pb-10 md:ml-[88px] md:px-8 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
