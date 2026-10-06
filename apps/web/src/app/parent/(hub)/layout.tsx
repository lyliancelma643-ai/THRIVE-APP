'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Coque de l'espace parent — design « Tour 3 » (une seule app, deux ambiances,
// navigation au pouce).
//
//   • Ambiance Nuit calme ↔ Jour clair par le rond soleil/lune du header. Un
//     seul jeu de tokens (globals.css) : le contenu ne bouge pas d'un pixel.
//   • Barre d'onglets « verre liquide » (LiquidTabBar) : toucher, maintenir, glisser.
//   • Les trois écrans d'onglet restent montés (TabPager) : passer de l'un à
//     l'autre ne recharge rien ; l'écran glisse dans le sens de l'onglet choisi et
//     chacun retrouve sa hauteur de défilement.
//   • On change aussi d'onglet en glissant le pouce sur le contenu.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { NotificationsBell } from '@/components/parent/NotificationsBell';
import { UserMenu } from '@/components/parent/UserMenu';
import { AmbianceToggle } from '@/components/parent/AmbianceToggle';
import { LiquidTabBar } from '@/components/parent/LiquidTabBar';
import { TabPager } from '@/components/parent/TabPager';
import BilansPage from './bilans/page';
import MySessionsPage from './my-sessions/page';
import MaisonPage from './fitness/page';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon, type IconName } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useThumbNav } from '@/hooks/useThumbNav';

// Onglets façon Apple Forme : Maison (programme P3 ; les séances vidéo Fitness restent
// dans /parent/fitness/seances) · Bilan (résumé) · Mes séances
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/parent/fitness', label: 'Maison', icon: 'home' },
  { href: '/parent/bilans', label: 'Bilan', icon: 'sparkle' },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: 'star' },
];
const MAISON_TAB = 0;
const BILAN_TAB = 1;
// Les trois écrans d'onglet, gardés montés par TabPager (aucun rechargement d'un onglet à l'autre).
const TAB_PAGES = [MaisonPage, BilansPage, MySessionsPage];

// Le lecteur de séance (/parent/session/…) appartient à l'univers Fitness ;
// la messagerie et la page forfaits vivent hors onglets (accès par le header).
function activeTabIndex(pathname: string): number {
  const i = TABS.findIndex((t) => pathname.startsWith(t.href));
  if (i >= 0) return i;
  if (pathname.startsWith('/parent/session')) return MAISON_TAB;
  if (
    pathname.startsWith('/parent/messages') ||
    pathname.startsWith('/parent/upgrade') ||
    pathname.startsWith('/parent/abonnement')
  )
    return -1;
  return BILAN_TAB;
}

export default function ParentHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeTabIndex(pathname);
  // Racine d'un onglet (et non une fiche, le carnet…) : affichée par TabPager.
  const rootTab = TABS.findIndex((t) => pathname === t.href || pathname === `${t.href}/`);
  // Direction « Soir de famille » : l'onglet Maison (hors séances vidéo) a sa propre matière.
  const maison = pathname.startsWith('/parent/fitness') && !pathname.startsWith('/parent/fitness/seances');
  const { access, isLoading: accessLoading, refresh } = useAccessStore();
  const unreadMessages = useUnreadMessages();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Les écrans les plus ouverts depuis les onglets sont préchargés dès le lancement :
  // ils s'ouvrent sans attente (le code et le rendu serveur sont déjà là).
  useEffect(() => {
    ['/parent/fitness/toutes', '/parent/fitness/programme', '/parent/fitness/carnet', '/parent/messages'].forEach((h) =>
      router.prefetch(h)
    );
  }, [router]);

  // Compte en préparation : onglets visibles mais non cliquables (aperçu).
  const locked = !accessLoading && access ? !access.unlocked : false;
  // Bilan et Maison restent toujours ouverts : Maison s'ouvre aux abonnés P3
  // sans activation par un coach, et montre l'invitation à s'abonner sinon.
  const tabOpen = (i: number) => !locked || i === BILAN_TAB || i === MAISON_TAB;

  // Sens de la dernière navigation : l'écran entrant glisse depuis ce côté.
  const [enterFrom, setEnterFrom] = useState(44);
  const lastTab = useRef(active);

  const goToTab = useCallback(
    (next: number, direction: 1 | -1) => {
      const target = TABS[next];
      if (!target || !tabOpen(next)) return;
      setEnterFrom(direction === 1 ? 44 : -44);
      if (rootTab >= 0) {
        // D'un onglet à l'autre : l'URL change sans navigation (rien à recharger),
        // TabPager fait glisser l'écran déjà monté.
        if (window.location.pathname !== target.href) window.history.pushState(null, '', target.href);
      } else {
        router.push(target.href);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locked, router, rootTab]
  );

  // Geste : actif seulement quand on est sur un des trois onglets.
  const { dragX, dragging, handlers } = useThumbNav({
    index: active < 0 ? 0 : active,
    count: TABS.length,
    onChange: goToTab,
    enabled: active >= 0 && !locked,
  });

  // Hors racines d'onglet (fiche, carnet…) : retour en haut au changement d'onglet.
  // Entre racines, TabPager rend à chaque onglet sa propre hauteur de défilement.
  useEffect(() => {
    if (lastTab.current === active) return;
    lastTab.current = active;
    if (rootTab < 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [active, rootTab]);

  /** Clic sur un onglet depuis une racine : glissement sans rechargement. */
  const tapTab = (i: number, e: React.MouseEvent) => {
    setEnterFrom(i > active ? 44 : -44);
    if (rootTab < 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (i !== active) goToTab(i, i > active ? 1 : -1);
  };

  return (
    // « Nuit calme » ou « Jour clair » : un aplat unique, ni dégradé ni halo. La
    // profondeur vient du seul contraste entre le fond et les cartes.
    <div className="min-h-dvh bg-night-bg text-night-body" data-surface={maison ? 'maison' : undefined}>
      {/* Barre haute posée à même le fond : logo + enfant à gauche, actions à
          droite. Plus de carte de verre — juste un filet en bas au défilement. */}
      <header className="sticky top-0 z-header bg-night-bg safe-top">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-2 sm:gap-3 animate-om-fade">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 lg:basis-0">
            {/* Zone tactile de 44 px autour du logo de 32 px. */}
            <Link href="/parent/bilans" className="shrink-0 select-none -m-1.5 p-1.5 rounded-xl" aria-label="Accueil THRIVE">
              <BrandLogo className="w-8 h-8" />
            </Link>
            <ChildSwitcher />
          </div>

          {/* ≥ 1024 px (iPad paysage, ordinateur) : les onglets montent dans
              l'en-tête, au centre — plus de barre de téléphone en bas d'un grand écran. */}
          <nav aria-label="Navigation principale" className="relative hidden lg:flex items-center p-1 rounded-full bg-surface-sub">
            {/* Le repère glisse d'un onglet à l'autre (320 ms) au lieu de sauter. */}
            <span
              aria-hidden
              className="nav-pill absolute top-1 left-1 h-11 w-[150px] rounded-full"
              style={{ transform: `translateX(${(active < 0 ? 0 : active) * 150}px)`, opacity: active < 0 ? 0 : 1 }}
            />
            {TABS.map((tab, i) =>
              !tabOpen(i) && active !== i ? (
                <span
                  key={tab.href}
                  aria-disabled
                  title="Disponible après l'activation par ton coach"
                  className="relative inline-flex items-center justify-center gap-2 h-11 w-[150px] rounded-full text-sm font-semibold text-faint cursor-not-allowed"
                >
                  <Icon name={tab.icon} className="w-[18px] h-[18px]" />
                  {tab.label}
                </span>
              ) : (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={(e) => tapTab(i, e)}
                  aria-current={active === i ? 'page' : undefined}
                  className={`relative inline-flex items-center justify-center gap-2 h-11 w-[150px] rounded-full text-sm font-semibold transition-colors duration-base ${
                    active === i ? 'text-ink' : 'text-soft hover:text-ink'
                  }`}
                >
                  <Icon
                    name={tab.icon}
                    fill={active === i ? 'currentColor' : 'none'}
                    className={`w-[18px] h-[18px] transition-colors duration-base ${active === i ? 'text-[color:var(--nav-active)]' : ''}`}
                  />
                  {tab.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-1.5 md:gap-2 shrink-0 lg:flex-1 lg:basis-0">
            <Link
              href="/parent/select-profile"
              className="hidden md:inline-flex lg:hidden xl:inline-flex items-center gap-1.5 h-11 px-5 whitespace-nowrap rounded-full bg-accent text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all select-none"
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
        className="max-w-7xl mx-auto px-5 md:px-8 pt-1 pb-32 md:pb-36 lg:pb-16 overflow-x-clip"
        style={{ touchAction: 'pan-y' }}
        {...handlers}
      >
        {/* Le contenu suit le doigt pendant le geste, puis l'écran entrant
            glisse depuis le sens du geste. `key` remonte l'écran à chaque
            navigation : un seul écran vit à la fois. */}
        <div
          style={{
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragging ? 'none' : 'transform var(--dur-slow) var(--ease-out)',
          }}
        >
          {rootTab < 0 && (
            <div
              key={pathname}
              className="animate-sc-swap"
              style={{ ['--sc-from' as string]: `${enterFrom}px` }}
            >
              {children}
            </div>
          )}
          <TabPager index={rootTab} pages={TAB_PAGES} />
        </div>
      </main>

      {/* Barre d'onglets « verre liquide » : toucher, maintenir, glisser — la page suit. */}
      <LiquidTabBar
        tabs={TABS}
        active={active}
        tabOpen={tabOpen}
        onNavigate={goToTab}
        onTap={tapTab}
      />
    </div>
  );
}
