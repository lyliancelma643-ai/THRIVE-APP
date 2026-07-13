'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { NotificationsBell } from '@/components/parent/NotificationsBell';
import { UserMenu } from '@/components/parent/UserMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { useAccessStore } from '@/lib/access';

// Onglets façon Apple Forme : Bilan (résumé) · Mes séances · Fitness
const TABS = [
  { href: '/parent/bilans', label: 'Bilan', icon: '◈' },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: '★' },
  { href: '/parent/fitness', label: 'Fitness', icon: '▦' },
];

// Le lecteur de séance (/parent/session/…) appartient à l'univers Fitness ;
// la messagerie et la page forfaits vivent hors onglets (accès par le header).
function activeTabIndex(pathname: string): number {
  const i = TABS.findIndex((t) => pathname.startsWith(t.href));
  if (i >= 0) return i;
  if (pathname.startsWith('/parent/session')) return 2;
  if (pathname.startsWith('/parent/messages') || pathname.startsWith('/parent/upgrade')) return -1;
  return 0;
}

export default function ParentHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = activeTabIndex(pathname);
  const { access, isLoading: accessLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // L'ajout d'un enfant (ou d'un autre parent) se fait à la demande via le
  // bouton « + Ajouter un enfant » de l'en-tête, jamais par une redirection
  // automatique juste après la connexion.

  // Compte en préparation : onglets visibles mais non cliquables (aperçu).
  const locked = !accessLoading && access ? !access.unlocked : false;

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-[#031b29] via-navy-900 to-[#01121b] text-white">
      {/* Halos ambiants — profondeur premium type Apple TV (atténués sur fond sombre) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-navy-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] rounded-full bg-sun/[0.07] blur-3xl" />
      </div>

      {/* Barre haute allégée : logo + profils. La navigation vit en bas, comme Apple Forme. */}
      <header className="sticky top-0 z-40 px-2 pt-2 md:px-4 md:pt-4 safe-top">
        <div className="glass-navy rounded-2xl max-w-7xl mx-auto px-3 py-2 md:px-5 md:py-2.5 flex items-center justify-between gap-2">
          <Link href="/parent/bilans" className="flex items-center gap-2 shrink-0 p-1 -m-1 select-none">
            <BrandLogo className="w-9 h-9 md:w-10 md:h-10 shadow-card" />
            <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-white/40">
              Sport Positive
            </span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Link
              href="/parent/select-profile"
              className="hidden md:flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all select-none"
            >
              + Ajouter un enfant
            </Link>
            <Link
              href="/parent/select-profile"
              aria-label="Ajouter un enfant"
              className="md:hidden w-11 h-11 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl font-bold active:scale-95 transition-transform select-none"
            >
              +
            </Link>
            <ChildSwitcher />
            <Link
              href="/parent/messages"
              aria-label="Messagerie avec le coach"
              className="w-11 h-11 rounded-full glass-navy hover:bg-white/10 flex items-center justify-center text-lg text-white/75 hover:text-white transition-colors select-none"
            >
              ✉
            </Link>
            <NotificationsBell />
            {/* Séparateur discret entre le profil enfant et le compte utilisateur */}
            <span className="w-px h-6 bg-white/10 mx-0.5 hidden sm:block" aria-hidden />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-32 md:pb-36">
        {/* Chaque changement d'onglet ré-anime le contenu (fondu + glissement iOS) */}
        <div key={pathname} className="animate-page-in">
          {children}
        </div>
      </main>

      {/* Tab bar liquid glass (Apple Forme) : bulle de verre qui glisse sous l'onglet actif */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-50 px-4 pointer-events-none"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
      >
        <div className="pointer-events-auto relative max-w-md mx-auto rounded-[28px] glass-navy p-1.5 shadow-[0_18px_50px_rgba(0,10,20,0.55)]">
          {/* Reflet spéculaire du verre */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-[28px] pointer-events-none"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.04)',
            }}
          />
          {active >= 0 && (
            <div
              aria-hidden
              className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[22px] bg-white/[0.14] border border-white/25 transition-transform duration-500"
              style={{
                width: 'calc((100% - 12px) / 3)',
                transform: `translateX(${active * 100}%)`,
                transitionTimingFunction: 'cubic-bezier(0.32, 1.35, 0.4, 1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 18px rgba(0,0,0,0.35)',
              }}
            />
          )}
          <div className="relative grid grid-cols-3 select-none">
            {TABS.map((tab, i) =>
              // Compte en préparation : hors onglets (active < 0), Bilan reste
              // cliquable pour ne jamais enfermer l'utilisateur.
              locked && (active >= 0 ? active !== i : i !== 0) ? (
                // Compte en préparation : les autres sections restent visibles
                // mais non cliquables (aperçu de ce qui attend l'utilisateur)
                <span
                  key={tab.href}
                  aria-disabled
                  title="Disponible après l'activation par votre coach"
                  className="flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] rounded-[22px] text-white/35 cursor-not-allowed"
                >
                  <span className="text-lg leading-none">{tab.icon}</span>
                  <span className="text-[11px] font-semibold tracking-wide">{tab.label}</span>
                </span>
              ) : (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active === i ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[52px] rounded-[22px] transition-all duration-300 active:scale-95 ${
                    active === i ? 'text-sun' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <span className="text-lg leading-none">{tab.icon}</span>
                  <span className="text-[11px] font-semibold tracking-wide">{tab.label}</span>
                </Link>
              ),
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
