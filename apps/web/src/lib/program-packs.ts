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
