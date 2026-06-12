'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { useChildStore } from '@/stores/child.store';
import { ageGroupFromBirthDate } from '@/lib/catalog';

export function ChildSwitcher() {
  const { user } = useAuthStore();
  const { children, selectedChildId, selectChild, loadChildren, isLoading } = useChildStore();
  const [open, setOpen] = useState(false);

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
    return <div className="h-10 w-32 rounded-full glass animate-pulse" />;
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
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full glass hover:bg-white/80 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-navy-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {selected?.first_name?.[0] ?? '?'}
        </span>
        <span className="text-sm font-medium text-navy-900 max-w-[7rem] truncate">
          {selected?.first_name}
        </span>
        <span className="text-navy-600/60 text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl glass-strong overflow-hidden z-50">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                selectChild(child.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-white/70 transition-colors ${
                child.id === selectedChildId ? 'font-bold text-navy-900' : 'text-navy-700'
              }`}
            >
              <span className="w-7 h-7 rounded-full bg-sage text-navy-900 flex items-center justify-center text-xs font-bold">
                {child.first_name[0]}
              </span>
              <span className="flex-1 truncate">{child.first_name}</span>
              <span className="text-[10px] text-navy-600/60">
                {ageGroupFromBirthDate(child.date_of_birth) ?? ''} ans
              </span>
            </button>
          ))}
          <Link
            href="/parent/select-profile"
            className="block px-4 py-2.5 text-xs font-semibold text-navy-600 hover:bg-white/70 transition-colors border-t border-white/50"
            onClick={() => setOpen(false)}
          >
            + Gérer les profils
          </Link>
          <button
            onClick={async () => {
              setOpen(false);
              const { supabaseClient } = await import('@thrive/shared');
              await supabaseClient.auth.signOut();
              window.location.href = '/login';
            }}
            className="sm:hidden block w-full text-left px-4 py-2.5 text-xs text-navy-600/70 hover:bg-white/70 transition-colors border-t border-white/50"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
