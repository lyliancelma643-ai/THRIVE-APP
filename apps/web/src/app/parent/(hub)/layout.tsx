'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Coque de l'espace parent — design « Tour 3 » (une seule app, deux ambiances,
// navigation au pouce).
//
//   • Ambiance Nuit calme ↔ Jour clair par le rond soleil/lune du header. Un
//     seul jeu de tokens (globals.css) : le contenu ne bouge pas d'un pixel.
//   • La barre d'onglets garde un filet de 2 px qui glisse sous l'onglet actif.
//   • On change d'onglet en glissant le pouce ; l'écran entrant arrive de 30 px
//     DANS LE SENS DU GESTE, avec un fondu (460 ms, courbe iOS).
//   • Retour en haut automatique à chaque changement d'onglet : jamais
//     d'arrivée au milieu d'un écran.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { NotificationsBell } from '@/components/parent/NotificationsBell';
import { UserMenu } from '@/components/parent/UserMenu';
import { AmbianceToggle } from '@/components/parent/AmbianceToggle';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useThumbNav } from '@/hooks/useThumbNav';

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
  const router = useRouter();
  const active = activeTabIndex(pathname);
  const { access, isLoading: accessLoading, refresh } = useAccessStore();
  const unreadMessages = useUnreadMessages();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Compte en préparation : onglets visibles mais non cliquables (aperçu).
  const locked = !accessLoading && access ? !access.unlocked : false;

  // Sens de la dernière navigation : l'écran entrant glisse depuis ce côté.
  const [enterFrom, setEnterFrom] = useState(30);
  const lastTab = useRef(active);

  const goToTab = useCallback(
    (next: number, direction: 1 | -1) => {
      const target = TABS[next];
      if (!target || (locked && next !== 0)) return;
      setEnterFrom(direction === 1 ? 30 : -30);
      router.push(target.href);
    },
    [locked, router]
  );

  // Geste : actif seulement quand on est sur un des trois onglets.
  const { dragX, dragging, handlers } = useThumbNav({
    index: active < 0 ? 0 : active,
    count: TABS.length,
    onChange: goToTab,
    enabled: active >= 0 && !locked,
  });

  // Retour en haut à chaque changement d'onglet — jamais au milieu d'un écran.
  useEffect(() => {
    if (lastTab.current === active) return;
    lastTab.current = active;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [active]);

  return (
    // « Nuit calme » ou « Jour clair » : un aplat unique, ni dégradé ni halo. La
    // profondeur vient du seul contraste entre le fond et les cartes.
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
              className="hidden md:inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-accent text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all select-none"
            >
              + Ajouter un enfant
            </Link>
            {/* Sur mobile, la maquette ne garde que trois actions à droite : le
                « + Ajouter un enfant » vit alors dans le menu du sélecteur
                d'enfant (« + Gérer les profils »), même destination. */}
            <Link
              href="/parent/messages"
              aria-label={
                unreadMessages
                  ? `Messagerie — ${unreadMessages} message(s) non lu(s)`
                  : 'Messagerie : coach et support THRIVE'
              }
              className="relative nc-iconbtn select-none"
            >
              <Icon name="mail" className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-accent text-accent-on text-[10px] font-bold grid place-items-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
            <NotificationsBell />
            <AmbianceToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        className="max-w-7xl mx-auto px-5 md:px-6 pt-1 pb-32 md:pb-36"
        style={{ touchAction: 'pan-y' }}
        {...handlers}
      >
        {/* Le contenu suit le doigt pendant le geste, puis l'écran entrant
            glisse depuis le sens du geste. `key` remonte l'écran à chaque
            navigation : un seul écran vit à la fois. */}
        <div
          style={{
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragging ? 'none' : 'transform .32s cubic-bezier(.22,.61,.36,1)',
          }}
        >
          <div
            key={pathname}
            className="animate-sc-swap"
            style={{ ['--sc-from' as string]: `${enterFrom}px` }}
          >
            {children}
          </div>
        </div>
      </main>

      {/* Tab bar pleine largeur, posée sur un aplat : pas de verre, pas de bulle
          glissante — un filet de 2 px se déplace sous l'onglet actif. */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 inset-x-0 z-50 border-t border-line"
        style={{
          background: 'var(--tab)',
          boxShadow: 'var(--tab-shadow)',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="relative max-w-md mx-auto pt-2.5 select-none">
          <span
            aria-hidden
            className="absolute top-0 left-0 h-0.5"
            style={{
              width: `${100 / TABS.length}%`,
              background: 'var(--nav-active)',
              transform: `translateX(${(active < 0 ? 0 : active) * 100}%)`,
              transition: 'transform .42s cubic-bezier(.22,.61,.36,1)',
              opacity: active < 0 ? 0 : 1,
            }}
          />
          <div className="grid grid-cols-3">
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
                  className="flex flex-col items-center gap-1.5 py-1.5 min-h-[48px] text-faint cursor-not-allowed"
                >
                  <Icon name={tab.icon} className="w-[22px] h-[22px]" />
                  <span className="text-xs font-semibold">{tab.label}</span>
                </span>
              ) : (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setEnterFrom(i > active ? 30 : -30)}
                  aria-current={active === i ? 'page' : undefined}
                  className="flex flex-col items-center gap-1.5 py-1.5 min-h-[48px] active:scale-95"
                  style={{
                    color: active === i ? 'var(--nav-active)' : 'var(--text3)',
                    transition: 'color .32s ease',
                  }}
                >
                  <Icon name={tab.icon} className="w-[22px] h-[22px]" />
                  <span className="text-xs font-semibold">{tab.label}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
