'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuthStore, logout } from '@/stores/auth.store';

const ROLE_LABELS: Record<string, string> = {
  PARENT: 'Parent',
  ADMIN: 'Administrateur',
  SUPER_ADMIN: 'Super admin',
  COACH: 'Coach',
};

/**
 * Menu utilisateur (avatar) — voisin du sélecteur d'enfant.
 * Donne accès aux paramètres du compte et à une déconnexion FIABLE
 * (purge locale garantie + rechargement dur via `logout()`).
 *
 * Le menu et son voile sont rendus dans <body> (portal) car le header en verre
 * (`backdrop-filter`) devient sinon le bloc conteneur des éléments `position:fixed`,
 * ce qui décalerait le menu hors de l'écran. Voir la note projet sur ce piège.
 */
export function UserMenu() {
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '👤';
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mon compte';

  // Non connecté (cas limite) : simple accès à la connexion.
  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        aria-label="Se connecter"
        className="w-11 h-11 rounded-full glass-navy flex items-center justify-center text-white/80 hover:bg-white/10 active:scale-95 transition-all select-none"
      >
        ⏻
      </Link>
    );
  }

  const handleLogout = async () => {
    setSigningOut(true);
    await logout(); // purge + redirection dure vers /login
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu du compte"
        className="w-11 h-11 rounded-full bg-navy-700 ring-1 ring-white/20 text-white flex items-center justify-center text-sm font-bold hover:ring-white/40 active:scale-95 transition-all select-none"
      >
        {initials}
      </button>

      {open &&
        menuPos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] cursor-default"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              className="fixed z-[70] w-64 rounded-2xl glass-navy overflow-hidden shadow-[0_18px_50px_rgba(0,10,20,0.5)]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {/* En-tête : identité */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                <span className="w-11 h-11 rounded-full bg-navy-700 ring-1 ring-white/20 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                  <p className="text-[11px] text-white/50 truncate">{user.email}</p>
                  {user.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/70 uppercase tracking-wide">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  )}
                </div>
              </div>

              <Link
                href="/parent/compte"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-3 min-h-[48px] text-sm text-white/80 hover:bg-white/10 active:bg-white/10 transition-colors"
              >
                <span className="text-base w-5 text-center" aria-hidden>⚙</span>
                Paramètres du compte
              </Link>

              <button
                onClick={handleLogout}
                disabled={signingOut}
                role="menuitem"
                className="flex items-center gap-3 w-full text-left px-4 py-3 min-h-[48px] text-sm font-semibold text-red-300 hover:bg-red-500/15 active:bg-red-500/20 transition-colors border-t border-white/10 disabled:opacity-60"
              >
                <span className="text-base w-5 text-center" aria-hidden>⏻</span>
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
