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

// Onglets façon Apple Forme : Bilan (résumé) · Mes séances · Maison (programme P3 ;
// les séances vidéo Fitness restent dans /parent/fitness/seances)
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: '/parent/bilans', label: 'Bilan', icon: 'sparkle' },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: 'star' },
  { href: '/parent/fitness', label: 'Maison', icon: 'home' },
];
const MAISON_TAB = 2;

// Le lecteur de séance (/parent/session/…) appartient à l'univers Fitness ;
// la messagerie et la page forfaits vivent hors onglets (accès par le header).
function activeTabIndex(pathname: string): number {
  const i = TABS.findIndex((t) => pathname.startsWith(t.href));
  if (i >= 0) return i;
  if (pathname.startsWith('/parent/session')) return 2;
  if (
    pathname.startsWith('/parent/messages') ||
    pathname.startsWith('/parent/upgrade') ||
    pathname.startsWith('/parent/abonnement')
  )
    return -1;
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
  // Bilan et Maison restent toujours ouverts : Maison s'ouvre aux abonnés P3
  // sans activation par un coach, et montre l'invitation à s'abonner sinon.
  const tabOpen = (i: number) => !locked || i === 0 || i === MAISON_TAB;

  // Sens de la dernière navigation : l'écran entrant glisse depuis ce côté.
  const [enterFrom, setEnterFrom] = useState(30);
  const lastTab = useRef(active);

  const goToTab = useCallback(
    (next: number, direction: 1 | -1) => {
      const target = TABS[next];
      if (!target || !tabOpen(next)) return;
      setEnterFrom(direction === 1 ? 30 : -30);
      router.push(target.href);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [active]);

  return (
    // « Nuit calme » ou « Jour clair » : un aplat unique, ni dégradé ni halo. La
    // profondeur vient du seul contraste entre le fond et les cartes.
    <div className="min-h-dvh bg-night-bg text-night-body">
      {/* Barre haute posée à même le fond : logo + enfant à gauche, actions à
          droite. Plus de carte de verre — juste un filet en bas au défilement. */}
      <header className="sticky top-0 z-header bg-night-bg safe-top">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-2 sm:gap-3 animate-om-fade">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 lg:basis-0">
            <Link href="/parent/bilans" className="shrink-0 select-none" aria-label="Accueil THRIVE">
              <BrandLogo className="w-8 h-8" />
            </Link>
            <ChildSwitcher />
          </div>

          {/* ≥ 1024 px (iPad paysage, ordinateur) : les onglets montent dans
              l'en-tête, au centre — plus de barre de téléphone en bas d'un grand écran. */}
          <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-surface-sub">
            {TABS.map((tab, i) =>
              !tabOpen(i) && active !== i ? (
                <span
                  key={tab.href}
                  aria-disabled
                  title="Disponible après l'activation par votre coach"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold text-faint cursor-not-allowed"
                >
                  <Icon name={tab.icon} className="w-[18px] h-[18px]" />
                  {tab.label}
                </span>
              ) : (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setEnterFrom(i > active ? 30 : -30)}
                  aria-current={active === i ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors duration-fast ${
                    active === i ? 'bg-night-surface text-ink shadow-[var(--shadow)]' : 'text-soft hover:text-ink'
                  }`}
                >
                  <Icon
                    name={tab.icon}
                    className={`w-[18px] h-[18px] ${active === i ? 'text-[color:var(--nav-active)]' : ''}`}
                  />
                  {tab.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-1.5 md:gap-2 shrink-0 lg:flex-1 lg:basis-0">
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
        className="max-w-7xl mx-auto px-5 md:px-8 pt-1 pb-32 md:pb-36 lg:pb-16"
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
        className="lg:hidden fixed bottom-0 inset-x-0 z-nav border-t border-line"
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
              !tabOpen(i) && active !== i ? (
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
