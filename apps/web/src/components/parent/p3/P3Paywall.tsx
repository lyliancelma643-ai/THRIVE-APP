'use client';

import { PackRequired } from '@/components/parent/PackRequired';

// ─────────────────────────────────────────────────────────────────────────────
// Écran bloquant de « Maison » pour un parent sans accès (ni pack THRIVE, ni
// compte activé, ni abonnement Maison, ni ouverture manuelle par l'admin) :
// invitation à prendre l'un des trois packs (Groupe, Individuel, Complet).
// ─────────────────────────────────────────────────────────────────────────────

export function P3Paywall() {
  return <PackRequired section="maison" />;
}
