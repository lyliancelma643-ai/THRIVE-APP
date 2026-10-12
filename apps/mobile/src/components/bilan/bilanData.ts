// Données et helpers purs du Bilan parent (écrans G à J, S, T).
// Les calculs restent côté serveur (RPC lsss_progression / perma_progression /
// gauge_summary) : ici on ne fait que lire et mettre en forme.

export type LsssMoment = 'BASELINE' | 'MID' | 'FINAL';
export const LSSS_MOMENT_LABEL: Record<LsssMoment, string> = {
  BASELINE: 'Départ',
  MID: 'Mi-parcours',
  FINAL: 'Final',
};
export const LSSS_MOMENT_ORDER: LsssMoment[] = ['BASELINE', 'MID', 'FINAL'];

export type PermaPillar = 'engagement' | 'perseverance' | 'optimism' | 'connectedness' | 'happiness';
export const PERMA_PILLAR_LABEL: Record<PermaPillar, string> = {
  engagement: 'Engagement',
  perseverance: 'Persévérance',
  optimism: 'Optimisme',
  connectedness: 'Connexion aux autres',
  happiness: 'Bonheur',
};

export type LsssPoint = { moment: LsssMoment; created_at: string; value: number };
export type PermaPoint = { session_number: number; created_at: string | null; value: number; pillars: Partial<Record<PermaPillar, number>> };
export type Gauge = { global: number; sample_size: number; by_skill: Record<string, number> };

export const ACCENT_KEYS = ['sun', 'amber', 'teal', 'sky', 'coral', 'violet'] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];
export const ACCENT_LABEL: Record<AccentKey, string> = {
  sun: 'Soleil', amber: 'Ambre', teal: 'Turquoise', sky: 'Ciel', coral: 'Corail', violet: 'Violet',
};
/** Couleur d'accent du passeport → nom de token du thème (aucune couleur en dur). */
export const ACCENT_TOKEN = {
  sun: 'sun', amber: 'sysOrange', teal: 'sysTeal', sky: 'sysBlue', coral: 'sysRed', violet: 'sysIndigo',
} as const;

export type Identity = { nickname: string | null; jersey_number: number | null; accent_color: AccentKey | null };

export function isAccentKey(v: unknown): v is AccentKey {
  return typeof v === 'string' && (ACCENT_KEYS as readonly string[]).includes(v);
}

export function skillLabel(key: string): string {
  const t = key.replace(/[_-]/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Numéro de maillot : entier 0–999 ou null (même contrainte que la base). */
export function parseJersey(input: string): number | null {
  const t = input.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  return Number(t);
}

export type CurvePoint = { x: number; y: number; value: number };
/** Place des valeurs 0–100 dans un rectangle w × h (marges incluses). */
export function curveGeometry(values: number[], w: number, h: number, pad = 24): { points: CurvePoint[]; min: number; max: number } {
  const lo = Math.min(40, ...values.map((v) => v - 5));
  const hi = Math.max(90, ...values.map((v) => v + 5));
  const n = values.length;
  const points = values.map((value, i) => ({
    x: n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1),
    y: h - 26 - ((value - lo) / (hi - lo)) * (h - 46),
    value,
  }));
  return { points, min: lo, max: hi };
}

/** Regroupe des éléments datés par jour (clé AAAA-MM-JJ locale), ordre d'entrée conservé. */
export function groupByDay<T extends { created_at: string }>(items: T[]): { day: string; items: T[] }[] {
  const out: { day: string; items: T[] }[] = [];
  for (const it of items) {
    const d = new Date(it.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const last = out[out.length - 1];
    if (last && last.day === key) last.items.push(it);
    else out.push({ day: key, items: [it] });
  }
  return out;
}

/** « Aujourd’hui », « Hier » ou date longue, selon le jour (clé AAAA-MM-JJ). */
export function dayLabel(dayKey: string, now: Date = new Date()): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((startToday.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  return date.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
}


/** Sections du bilan du coach visibles par le parent (ordre d'affichage). */
export const REPORT_SECTION_LABELS: Record<string, string> = {
  message_coach: 'Le mot du coach',
  forces: 'Ses forces',
  resume: 'Résumé de la séance',
  objectif: 'Habileté travaillée',
  recommandations_maison: 'À la maison',
  transfert: 'Dans la vie de tous les jours',
};

export function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(String).join(' · ');
  if (typeof v === 'object') return null;
  return String(v);
}
