'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { ChildSwitcher } from './ChildSwitcher';

const NAV_ITEMS = [
  { href: '/parent', label: 'Accueil', icon: '⌂', exact: true },
  { href: '/parent/my-sessions', label: 'Mes séances', icon: '★', exact: false },
  { href: '/parent/library', label: 'Toutes les séances', icon: '▦', exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-navy-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link href="/parent" className="block">
          <span className="font-display text-2xl font-semibold tracking-wide">
            THRIVE<span className="text-sun">↑</span>
          </span>
          <span className="block text-[11px] uppercase tracking-[0.2em] text-sage mt-1">
            Sport Positive
          </span>
        </Link>
      </div>

      {/* Sélecteur d'enfant */}
      <div className="px-4 pb-4">
        <ChildSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-navy-600 text-white'
                  : 'text-navy-100/80 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Compte */}
      <div className="px-4 py-5 border-t border-navy-800">
        <p className="text-sm font-medium truncate">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-navy-200/60 truncate mb-3">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="text-xs text-navy-200/80 hover:text-sun transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
