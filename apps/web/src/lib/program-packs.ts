// Les trois packs THRIVE vendus sur le site (Groupe, Individuel, Complet).
// Maison s'ouvre par l'un des trois packs, l'abonnement Maison ou un forçage admin (migration 075) ; Bilan et Mes séances
// suivent le cycle d'activation par le coach. L'Admin / Super Admin peut forcer chaque
// section parent par parent (table parent_access, migration 068).
//
// À ne pas confondre avec le niveau de détail des bilans (families.pack :
// codes internes ESSENTIEL / AVANCE / PERFORMANCE, libellés Groupe / Individuel / Complet, cf. packs.ts).

export type ProgramPack = 'GROUPE' | 'INDIVIDUEL' | 'COMPLET';

export const PROGRAM_PACK_ORDER: ProgramPack[] = ['GROUPE', 'INDIVIDUEL', 'COMPLET'];

export const PROGRAM_PACK_LABELS: Record<ProgramPack, string> = {
  GROUPE: 'Groupe',
  INDIVIDUEL: 'Individuel',
  COMPLET: 'Complet',
};

export function asProgramPack(v: unknown): ProgramPack | null {
  return v === 'GROUPE' || v === 'INDIVIDUEL' || v === 'COMPLET' ? v : null;
}

// Sections de l'espace parent réglables par l'admin.
export type ParentSection = 'maison' | 'bilan' | 'seances';

export const PARENT_SECTIONS: { key: ParentSection; label: string }[] = [
  { key: 'maison', label: 'Maison' },
  { key: 'bilan', label: 'Bilan' },
  { key: 'seances', label: 'Mes séances' },
];

// Page des trois packs sur le site vitrine. Configurable via NEXT_PUBLIC_PACKS_URL ;
// sinon le site vitrine (NEXT_PUBLIC_SITE_URL, comme l'écran de connexion).
export const PACKS_URL =
  process.env.NEXT_PUBLIC_PACKS_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://thrivesportpositive.com';

// ── Affichage du paiement d'un programme (GO 3 · O2) ────────────────────────
// CONSTANTES D'AFFICHAGE seulement : le montant réellement facturé est décidé par le
// serveur (create-program-checkout, supabase/functions/_shared/program_billing.ts) ;
// le client n'envoie jamais de montant, seulement { pack, mode }.
// Prix hors taxes en cents CAD (gamme V3) ; TPS 5 % + TVQ 9,975 % arrondies au cent.

export type ProgramMode = 'deux_versements' | 'une_fois';

export const PROGRAM_PACK_TOTAL_HT_CENTS: Record<ProgramPack, number> = {
  GROUPE: 60_000,
  INDIVIDUEL: 150_000,
  COMPLET: 200_000,
};

export const PROGRAM_PACK_DESCRIPTIONS: Record<ProgramPack, string> = {
  GROUPE: '13 séances en petit groupe (4 à 6 enfants).',
  INDIVIDUEL: '13 séances en tête-à-tête avec ton coach, de 60 à 70 minutes, et le Book THRIVE.',
  COMPLET: '13 séances en tête-à-tête, puis l’intégration au groupe.',
};

const roundDiv = (n: number, d: number) => Math.floor((n * 2 + d) / (d * 2));

export function programTaxCents(htCents: number): number {
  return roundDiv(htCents * 5, 100) + roundDiv(htCents * 9975, 100_000);
}

export type ProgramDisplayInstallment = {
  rank: 1 | 2;
  dueWhen: 'inscription' | 'seance_7';
  htCents: number;
  taxCents: number;
  ttcCents: number;
};

/** Versements affichés (même découpage que le serveur : le 1er arrondi vers le haut). */
export function programDisplayInstallments(pack: ProgramPack, mode: ProgramMode): ProgramDisplayInstallment[] {
  const total = PROGRAM_PACK_TOTAL_HT_CENTS[pack];
  const first = mode === 'une_fois' ? total : Math.ceil(total / 2);
  const parts: [1 | 2, 'inscription' | 'seance_7', number][] =
    mode === 'une_fois'
      ? [[1, 'inscription', first]]
      : [[1, 'inscription', first], [2, 'seance_7', total - first]];
  return parts.map(([rank, dueWhen, htCents]) => {
    const taxCents = programTaxCents(htCents);
    return { rank, dueWhen, htCents, taxCents, ttcCents: htCents + taxCents };
  });
}

/** 34493 → « 344,93 $ » (fr-CA). */
export function formatCad(cents: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

/** Page web d'un programme (aussi page de retour de Stripe). */
export const programPagePath = (pack: ProgramPack) => `/parent/programme/${pack.toLowerCase()}`;
