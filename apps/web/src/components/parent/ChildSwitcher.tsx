'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { ageGroupFromBirthDate } from '@/lib/catalog';

export function ChildSwitcher() {
  const { user } = useAuthStore();
  const { children, selectedChildId, selectChild, loadChildren, isLoading } = useChildStore();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Menu et voile rendus dans <body> (portal) : le backdrop-filter du header
  // ferait sinon d'eux des éléments « fixed » relatifs au header, pas à l'écran.
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const toggleMenu = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((v) => !v);
  };

  // Échap referme le menu (cohérent avec les modales)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (user?.id) loadChildren(user.id);
  }, [user?.id, loadChildren]);

  // Realtime : un enfant ajouté (par le parent ou par l'admin) apparaît sans recharger
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`parent-children-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children' }, () =>
        loadChildren(user.id)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, () =>
        loadChildren(user.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadChildren]);

  const selected = children.find((c) => c.id === selectedChildId) ?? null;

  if (isLoading && children.length === 0) {
    return <div className="h-10 w-32 rounded-full glass-navy animate-pulse" />;
  }

  if (children.length === 0) {
    return (
      <Link
        href="/parent/select-profile"
        className="px-4 py-2 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark transition-colors"
      >
        + Ajouter un enfant
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 pl-1.5 pr-3 h-11 rounded-full glass-navy hover:bg-white/10 transition-colors select-none"
      >
        <span className="w-8 h-8 rounded-full bg-sun text-navy-900 flex items-center justify-center text-sm font-bold shrink-0">
          {selected?.first_name?.[0] ?? '?'}
        </span>
        <span className="text-sm font-medium text-white max-w-[7rem] truncate">
          {selected?.first_name}
        </span>
        <span
          className={`text-white/50 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open &&
        menuPos &&
        createPortal(
          <>
            {/* Voile plein écran : un tap hors du menu le referme SANS activer
                l'élément situé dessous (évite les clics fantômes) */}
            <div
              className="fixed inset-0 z-[60] cursor-default"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[70] w-60 rounded-2xl glass-navy overflow-hidden shadow-[0_18px_50px_rgba(0,10,20,0.5)]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  selectChild(child.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 min-h-[48px] text-sm text-left hover:bg-white/10 active:bg-white/10 transition-colors ${
                  child.id === selectedChildId ? 'font-bold text-white' : 'text-white/70'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-sage text-navy-900 flex items-center justify-center text-xs font-bold shrink-0">
                  {child.first_name[0]}
                </span>
                <span className="flex-1 truncate">{child.first_name}</span>
                {child.id === selectedChildId && (
                  <span className="text-sun text-xs" aria-hidden>
                    ✓
                  </span>
                )}
                {ageGroupFromBirthDate(child.date_of_birth) && (
                  <span className="text-[10px] text-white/45">
                    {ageGroupFromBirthDate(child.date_of_birth)} ans
                  </span>
                )}
              </button>
            ))}
            <Link
              href="/parent/select-profile"
              className="flex items-center px-4 py-3 min-h-[48px] text-[13px] font-semibold text-sun hover:bg-white/10 active:bg-white/10 transition-colors border-t border-white/10"
              onClick={() => setOpen(false)}
            >
              + Gérer les profils
            </Link>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
