import type { Movement, P3Activity } from '../../lib/p3';

/** Ajoute de la transparence à une couleur #rrggbb du thème (pour les dégradés vers le fond). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
  return `#${m[1]}${a}`;
}

export const MOVEMENT_LABEL: Record<Movement, string> = {
  assis: 'Posé',
  debout: 'Debout',
  actif: 'Actif',
};

/** « Rien à préparer » ou la liste du matériel (3 premiers éléments). */
export function materialsLabel(a: P3Activity): string {
  return a.materials.length === 0 ? 'Rien à préparer' : a.materials.slice(0, 3).join(', ');
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
}
