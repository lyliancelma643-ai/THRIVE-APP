'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { NotificationsBell } from '@/components/parent/NotificationsBell';
import { UserMenu } from '@/components/parent/UserMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { useAccessStore } from '@/lib/access';

// Onglets façon Apple Forme : Bilan (résumé) · Mes séances · Fitness
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/parent/bilans', label: 'Bilan', icon: 'sparkle' },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: 'star' },
  { href: '/parent/fitness', label: 'Fitness', icon: 'grid' },
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
    // « Nuit calme » : un aplat unique, ni dégradé ni halo. La profondeur vient
    // uniquement du contraste entre le fond (#06161E) et les cartes (#0C2029).
    <div className="min-h-screen bg-night-bg text-night-body">
      {/* Barre haute posée à même le fond : logo + enfant à gauche, actions à
          droite. Plus de carte de verre — juste un filet en bas au défilement. */}
      <header className="sticky top-0 z-40 bg-night-bg safe-top">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-3 flex items-center justify-between gap-3 animate-om-fade">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link href="/parent/bilans" className="shrink-0 select-none" aria-label="Accueil THRIVE">
              <BrandLogo className="w-8 h-8" />
            </Link>
            <ChildSwitcher />
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Link
              href="/parent/select-profile"
              className="hidden md:inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all select-none"
            >
              + Ajouter un enfant
            </Link>
            {/* Sur mobile, la maquette ne garde que deux actions à droite : le
                « + Ajouter un enfant » vit alors dans le menu du sélecteur
                d'enfant (« + Gérer les profils »), même destination. */}
            <Link
              href="/parent/messages"
              aria-label="Messagerie avec le coach"
              className="nc-iconbtn select-none"
            >
              <Icon name="mail" className="w-5 h-5" />
            </Link>
            <NotificationsBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 md:px-6 pt-1 pb-32 md:pb-36">
        {/* Chaque changement d'onglet ré-anime le contenu (fondu + glissement iOS) */}
        <div key={pathname} className="animate-page-in">
          {children}
        </div>
      </main>

      {/* Tab bar pleine largeur, posée sur un aplat : pas de verre, pas de bulle
          glissante — l'onglet actif se signale par la seule couleur d'accent. */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-50 bg-night-nav border-t border-white/[0.08]"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto grid grid-cols-3 pt-2.5 select-none">
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
                className="flex flex-col items-center gap-1.5 py-1.5 min-h-[48px] text-white/30 cursor-not-allowed"
              >
                <Icon name={tab.icon} className="w-[22px] h-[22px]" />
                <span className="text-xs font-semibold">{tab.label}</span>
              </span>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active === i ? 'page' : undefined}
                className={`flex flex-col items-center gap-1.5 py-1.5 min-h-[48px] transition-colors duration-200 active:scale-95 ${
                  active === i ? 'text-sun' : 'text-[rgba(234,243,241,0.62)] hover:text-night-ink'
                }`}
              >
                <Icon name={tab.icon} className="w-[22px] h-[22px]" />
                <span className="text-xs font-semibold">{tab.label}</span>
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
