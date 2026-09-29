'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore, logout } from '@/stores/auth.store';
import { getMfaStatus } from '@/lib/mfa';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useModalDismiss } from '@/lib/useModalDismiss';

type NavItem = {
  href: string;
  label: string;
  /** Libellé court du rail iPad (une ligne). */
  short?: string;
  icon: IconName;
  superAdminOnly?: boolean;
};

// Mêmes entrées qu'avant, regroupées en sections pour qu'on les retrouve
// d'un coup d'œil (disposition seulement : aucune destination ne change).
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
      { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
      { href: '/admin/supervision', label: 'Supervision', icon: 'compass', superAdminOnly: true },
      { href: '/admin/roadmap', label: 'Roadmap', icon: 'flag' },
    ],
  },
  {
    title: 'Suivi',
    items: [
      { href: '/admin/dossiers', label: 'Dossiers', icon: 'folder' },
      { href: '/admin/validations', label: 'Validations', icon: 'check' },
      { href: '/admin/assignments', label: 'Assignations', short: 'Assign.', icon: 'link' },
    ],
  },
  {
    title: 'Personnes',
    items: [
      { href: '/admin/users', label: 'Comptes', icon: 'user' },
      { href: '/admin/coaches', label: 'Coaches', icon: 'target' },
      { href: '/admin/families', label: 'Familles', icon: 'users' },
      { href: '/admin/children', label: 'Enfants', icon: 'child' },
      { href: '/admin/waitlist', label: 'Liste d’attente', short: 'Attente', icon: 'mail', superAdminOnly: true },
    ],
  },
  {
    title: 'Contenu',
    items: [
      { href: '/admin/programs', label: 'Programmes', short: 'Program.', icon: 'trophy' },
      { href: '/admin/questionnaires', label: 'Questionnaires', short: 'Quest.', icon: 'clipboard' },
      { href: '/admin/badges', label: 'Badges', icon: 'award' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/admin/messages', label: 'Messages', icon: 'message' },
      { href: '/admin/notifications', label: 'Notifications', short: 'Notif.', icon: 'bell' },
    ],
  },
  {
    title: 'Système',
    items: [
      { href: '/admin/reglages', label: 'Réglages', icon: 'settings', superAdminOnly: true },
      { href: '/settings/security', label: 'Sécurité', icon: 'lock' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const unreadMessages = useUnreadMessages(isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);

  // Toute navigation referme le menu du téléphone.
  useEffect(() => setMenuOpen(false), [pathname]);

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
      <div className="min-h-dvh flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4" role="status" aria-label="Chargement">
          <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-navy-600/80 text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  const sections = NAV_SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((i) => !i.superAdminOnly || user.role === 'SUPER_ADMIN'),
  })).filter((sec) => sec.items.length);
  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));
  const current = sections.flatMap((s) => s.items).find((i) => isActive(i.href));
  const unreadBadge = (href: string, cls: string) =>
    href === '/admin/messages' && unreadMessages > 0 ? (
      <span className={cls} aria-label={`${unreadMessages} message(s) non lu(s)`}>
        {unreadMessages > 9 ? '9+' : unreadMessages}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh bg-cream">
      {/* Téléphone : barre haute (logo, écran courant, menu) */}
      <div className="md:hidden fixed top-0 inset-x-0 z-header bg-navy-900 text-white safe-top">
        <div className="flex items-center gap-3 px-4 h-[60px]">
          <BrandLogo className="w-7 h-7 shrink-0" />
          <p className="flex-1 min-w-0 truncate text-sm font-semibold">
            {current?.label ?? 'Espace admin'}
          </p>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="relative inline-flex items-center gap-2 h-11 px-4 -mr-2 rounded-full bg-navy-800 text-sm font-semibold"
          >
            <Icon name="menu" className="w-5 h-5" />
            Menu
            {unreadMessages > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sun" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <AdminMenuSheet onClose={() => setMenuOpen(false)}>
          {sections.map((sec) => (
            <div key={sec.title} className="mb-5">
              <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-200/80">{sec.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {sec.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`flex items-center gap-2.5 min-h-[48px] px-3 rounded-xl text-sm ${
                      isActive(item.href) ? 'bg-white text-navy-900 font-semibold' : 'bg-navy-800 text-navy-50'
                    }`}
                  >
                    <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {unreadBadge(item.href, 'ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center')}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => logout()}
            className="w-full min-h-[48px] rounded-xl border border-navy-700 text-sm font-semibold text-navy-50"
          >
            Se déconnecter
          </button>
        </AdminMenuSheet>
      )}

      {/* iPad (768–1023 px) : rail ; ≥ 1024 px : barre latérale par sections */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-header w-[88px] lg:w-64 bg-navy-900 text-white flex-col safe-top">
        <div className="px-4 lg:px-6 pt-6 pb-4 flex flex-col items-center lg:items-start border-b border-navy-800">
          <BrandLogo className="w-10 h-10 shadow-card" />
          <p className="hidden lg:block text-navy-200/80 text-xs mt-2">Espace admin</p>
        </div>
        <nav aria-label="Navigation admin" className="flex-1 px-2 lg:px-3 py-3 overflow-y-auto overscroll-contain">
          {sections.map((sec) => (
            <div key={sec.title} className="mb-3 lg:mb-4">
              <p className="hidden lg:block px-3 mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-navy-200/70">
                {sec.title}
              </p>
              <div className="lg:hidden mx-3 mb-2 h-px bg-navy-800 first:hidden" aria-hidden />
              {sec.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-3 py-2 min-h-[52px] lg:min-h-[40px] rounded-xl mb-0.5 text-[11px] lg:text-sm transition-colors duration-fast ${
                      active
                        ? 'bg-white text-navy-900 font-semibold'
                        : 'text-navy-100/85 hover:bg-navy-800 hover:text-white'
                    }`}
                  >
                    <Icon name={item.icon} className="w-5 h-5 shrink-0" />
                    <span className="lg:hidden truncate max-w-full">{item.short ?? item.label}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                    {unreadBadge(
                      item.href,
                      'absolute top-1 right-3 lg:static lg:ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-sun text-navy-900 text-[10px] font-bold flex items-center justify-center'
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-2 lg:p-4 border-t border-navy-800">
          <div className="hidden lg:block px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-navy-200/80">{user.role === 'SUPER_ADMIN' ? 'Super admin' : 'Administrateur'}</p>
          </div>
          <button
            onClick={() => logout()}
            aria-label="Se déconnecter"
            className="w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-3 px-1 lg:px-3 min-h-[48px] lg:min-h-[44px] rounded-xl text-[11px] lg:text-sm text-navy-100/85 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <Icon name="power" className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="lg:hidden">Quitter</span>
            <span className="hidden lg:inline">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-10 pt-[calc(76px+env(safe-area-inset-top))] md:pt-8 md:ml-[88px] md:px-8 lg:ml-64 lg:px-10">
        <div className="mx-auto w-full max-w-[1320px]">{children}</div>
      </main>
    </div>
  );
}

// Menu admin du téléphone : feuille plein écran, fermeture par ✕, Échap ou
// après le choix d'une destination.
function AdminMenuSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useModalDismiss(onClose, true, true);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de l'espace admin"
      className="md:hidden fixed inset-0 z-modal bg-navy-900 text-white flex flex-col animate-om-fade"
    >
      <div className="flex items-center justify-between px-4 h-[60px] safe-top shrink-0">
        <p className="font-display text-lg font-semibold">Espace admin</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="w-11 h-11 -mr-2 rounded-full grid place-items-center bg-navy-800"
        >
          <Icon name="close" className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
