'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { ageGroupFromBirthDate } from '@/lib/catalog';
import { Icon } from '@/components/ui';

// Âge exact (et non la tranche) : l'en-tête « Nuit calme » affiche « Léa · 12 ans ».
function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

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
    return <div className="h-5 w-28 rounded-full bg-white/10 animate-pulse" />;
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

  const age = ageFromDob(selected?.date_of_birth);

  return (
    <div className="relative min-w-0 flex-1">
      {/* « Nuit calme » : le sélecteur n'est plus une pastille de verre mais la
          ligne d'identité de l'en-tête — « Léa · 12 ans », discrète et cliquable. */}
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Changer d'enfant"
        className="flex items-center gap-0.5 w-full min-w-0 h-11 -mx-1 px-1 text-[13px] font-semibold tracking-[0.02em] text-[rgba(234,243,241,0.62)] hover:text-night-ink transition-colors select-none"
      >
        <span className="truncate">
          {selected?.first_name}
          {age != null ? ` · ${age} ans` : ''}
        </span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <Icon name="chevron-down" className="w-4 h-4" />
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
              className="fixed z-[70] w-60 rounded-2xl bg-night-surface ring-1 ring-white/[0.08] overflow-hidden shadow-[0_18px_50px_rgba(0,10,20,0.5)]"
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
                  <Icon name="check" className="w-4 h-4 text-sun shrink-0" />
                )}
                {ageGroupFromBirthDate(child.date_of_birth) && (
                  <span className="text-[10px] text-white/60">
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
