// Affichage des programmes THRIVE (gamme V3). Logique PURE, testée.
// ATTENTION : constantes d'AFFICHAGE seulement. Le serveur fait foi pour le montant,
// les taxes et les versements ; le client n'envoie jamais de montant.

import type { ProgramPack, ProgramPaymentMode } from '../../services/programPayments';

/** TPS 5 % + TVQ 9,975 % (Québec) : coefficient ×1,14975, en entiers pour éviter les flottants. */
const TAX_NUM = 114975;
const TAX_DEN = 100000;

export type ProgramInfo = {
  pack: ProgramPack;
  name: string;
  /** Prix du programme hors taxes, en cents. */
  totalCents: number;
  /** Nombre de versements en mode « deux versements ». */
  installments: number;
  tagline: string;
  description: string;
  featured: boolean;
};

export const PROGRAMS: readonly ProgramInfo[] = [
  {
    pack: 'groupe',
    name: 'Groupe',
    totalCents: 60000,
    installments: 2,
    tagline: 'Notre programme phare',
    description: '13 séances en petit groupe (4 à 6 enfants), ateliers sportifs.',
    featured: true,
  },
  {
    pack: 'individuel',
    name: 'Individuel',
    totalCents: 150000,
    installments: 2,
    tagline: 'Seul avec un coach',
    description: '13 séances 1:1 de 60 à 70 min, et le Book THRIVE à la fin.',
    featured: false,
  },
  {
    pack: 'complet',
    name: 'Complet',
    totalCents: 200000,
    installments: 2,
    tagline: 'Le parcours le plus complet',
    description: '13 séances 1:1, puis l’intégration progressive au groupe.',
    featured: false,
  },
] as const;

export function programByPack(pack: string | null | undefined): ProgramInfo | null {
  return PROGRAMS.find((p) => p.pack === pack) ?? null;
}

/** Montant TTC en cents, arrondi au cent (demi vers le haut), en arithmétique entière. */
export function withTaxesCents(cents: number): number {
  return Math.floor((cents * TAX_NUM + TAX_DEN / 2) / TAX_DEN);
}

/** Part payée aujourd'hui (HT, en cents) selon le mode. */
export function todayCents(p: ProgramInfo, mode: ProgramPaymentMode): number {
  return mode === 'une_fois' ? p.totalCents : Math.round(p.totalCents / p.installments);
}

/** « 344,93 $ » : cents → texte français (espace fine insécable pour les milliers). */
export function formatCentsFr(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${sign}${whole},${frac}\u00A0$`;
}

/** « 600 $ » (sans les cents quand ils sont nuls). */
export function formatCentsShortFr(cents: number): string {
  return cents % 100 === 0 ? formatCentsFr(cents).replace(',00', '') : formatCentsFr(cents);
}
