'use client';

// Espace coach — tableau de suivi des dossiers (complétude par athlète).

import { DossierTable } from '@/components/coach/DossierTable';

export default function CoachDossiersPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-2">Suivi des dossiers</h1>
      <p className="text-navy-600/70 mb-8">
        L&apos;état de complétion de chaque athlète en un coup d&apos;œil. Ouvrez un dossier incomplet
        pour le finaliser.
      </p>
      <DossierTable basePath="/coach/athletes" />
    </div>
  );
}
