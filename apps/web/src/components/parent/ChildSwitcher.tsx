'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const selected = children.find((c) => c.id === selectedChildId) ?? null;

  if (isLoading && children.length === 0) {
    return <div className="h-12 rounded-xl bg-navy-800 animate-pulse" />;
  }

  if (children.length === 0) {
    return (
      <Link
        href="/parent/select-profile"
        className="block w-full px-3 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-sm text-sage text-center transition-colors"
      >
        + Ajouter un enfant
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 transition-colors text-left"
      >
        <span className="w-8 h-8 rounded-full bg-sun text-navy-900 flex items-center justify-center text-sm font-bold shrink-0">
          {selected?.first_name?.[0] ?? '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate">{selected?.first_name}</span>
          <span className="block text-[11px] text-sage">
            {ageGroupFromBirthDate(selected?.date_of_birth ?? null) ?? 'âge inconnu'} ans
          </span>
        </span>
        <span className="text-navy-200/70 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-navy-800 border border-navy-700 shadow-card overflow-hidden z-50">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                selectChild(child.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-navy-700 transition-colors ${
                child.id === selectedChildId ? 'text-sun' : 'text-white'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-sage text-navy-900 flex items-center justify-center text-xs font-bold">
                {child.first_name[0]}
              </span>
              {child.first_name}
            </button>
          ))}
          <Link
            href="/parent/select-profile"
            className="block px-3 py-2.5 text-xs text-sage hover:bg-navy-700 transition-colors border-t border-navy-700"
            onClick={() => setOpen(false)}
          >
            + Gérer les profils
          </Link>
        </div>
      )}
    </div>
  );
}
