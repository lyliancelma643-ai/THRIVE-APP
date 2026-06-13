'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { BrandLogo } from '@/components/BrandLogo';

const NAV_ITEMS = [
  { href: '/parent', label: 'Accueil', icon: '⌂', exact: true },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: '★', exact: false },
  { href: '/parent/library', label: 'Toutes les séances', icon: '▦', exact: false },
];

export default function ParentHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-cream relative">
      {/* Fond décoratif pour révéler l'effet de verre */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-navy-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-sage/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[28rem] h-[28rem] rounded-full bg-sun/25 blur-3xl" />
      </div>

      {/* Barre de navigation horizontale (liquid glass) */}
      <header className="sticky top-0 z-50 px-2 pt-2 md:px-4 md:pt-4">
        <div className="glass-strong rounded-2xl max-w-7xl mx-auto px-3 py-2 md:px-5 md:py-3 flex items-center gap-1.5 md:gap-2">
          <Link href="/parent" className="flex items-center gap-2 mr-1 md:mr-4 shrink-0">
            <span className="inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-navy-900 shadow-card">
              <BrandLogo className="h-6 md:h-7 w-auto" />
            </span>
            <span className="hidden lg:block text-[10px] uppercase tracking-[0.2em] text-navy-600/60">
              Sport Positive
            </span>
          </Link>

          <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-navy-600 text-white shadow-card'
                      : 'text-navy-700 hover:bg-white/70'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Link
              href="/parent/select-profile"
              className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark transition-colors"
            >
              + Ajouter un enfant
            </Link>
            <Link
              href="/parent/select-profile"
              aria-label="Ajouter un enfant"
              className="md:hidden w-9 h-9 rounded-full bg-sun text-navy-900 flex items-center justify-center text-lg font-bold"
            >
              +
            </Link>
            <ChildSwitcher />
            <button
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
              title={user?.email}
              className="hidden sm:block px-3 py-2 rounded-full text-xs text-navy-600/70 hover:bg-white/70 hover:text-navy-900 transition-colors"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  );
}
