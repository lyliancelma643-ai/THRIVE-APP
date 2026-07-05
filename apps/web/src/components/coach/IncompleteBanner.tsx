'use client';

// Bandeau d'alerte « dossiers incomplets » — dashboard coach & admin.
// S'appuie sur list_dossiers() (déjà filtré par rôle côté SQL).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DossierRow, fetchDossiers } from '@/lib/bilan';

export function IncompleteBanner({ href }: { href: string }) {
  const [rows, setRows] = useState<DossierRow[] | null>(null);

  useEffect(() => {
    fetchDossiers().then(setRows);
  }, []);

  if (!rows) return null;
  const incomplete = rows.filter((r) => r.pct < 100);
  const pending = rows.filter((r) => r.pending_lsss);
  if (incomplete.length === 0 && pending.length === 0) return null;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100/70 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-lg shrink-0">
        ⚠
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-navy-900 text-sm">
          {incomplete.length > 0
            ? `${incomplete.length} dossier${incomplete.length > 1 ? 's' : ''} à compléter`
            : 'Questionnaires en attente'}
        </span>
        <span className="block text-xs text-navy-600/70">
          {pending.length > 0 && `${pending.length} questionnaire(s) LSSS en attente · `}
          Ouvrir le suivi des dossiers →
        </span>
      </span>
    </Link>
  );
}
