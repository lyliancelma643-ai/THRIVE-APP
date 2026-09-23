// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — couche applicative pure (sans React ni I/O).
//
// Ce qui relie les règles métier (index.ts) aux écrans : chemins, âge de
// l'enfant, lignes de la base, charges utiles des récompenses, gabarits de
// textes. Aucun texte de fiche ici : tout le contenu reste dans le JSON généré.
// ─────────────────────────────────────────────────────────────────────────────

import {
  P3_ACTIVITIES,
  publishedActivities,
  type AgeBand,
  type CaptureKind,
  type Duration,
  type Moment,
  type P3Activity,
  type Place,
  type RewardId,
} from './index';

/** Le programme Maison occupe l'onglet Fitness (les séances vidéo vivent dans /parent/fitness/seances). */
export const P3_BASE = '/parent/fitness';

/**
 * Fiches servies : « publie » en production ; « revu » en plus hors production
 * ou si NEXT_PUBLIC_P3_SHOW_REVIEWED=1 (recette avant validation de Lylian).
 */
export const SHOW_REVIEWED =
  process.env.NEXT_PUBLIC_P3_SHOW_REVIEWED === '1' || process.env.NODE_ENV !== 'production';

export function p3Pool(): P3Activity[] {
  return publishedActivities(P3_ACTIVITIES, SHOW_REVIEWED);
}

export const DURATIONS: Duration[] = [10, 20, 30];

/** Lieux proposés au parent (« partout » est une propriété de fiche, pas un choix). */
export const PLACE_CHOICES: { id: Exclude<Place, 'partout'>; label: string }[] = [
  { id: 'maison', label: 'À la maison' },
  { id: 'exterieur', label: 'Dehors' },
  { id: 'voiture', label: 'En voiture' },
];

export function parseDuration(raw: string | null | undefined): Duration {
  const n = Number(raw);
  return n === 20 || n === 30 ? n : 10;
}

export function parsePlace(raw: string | null | undefined): Exclude<Place, 'partout'> {
  return raw === 'exterieur' || raw === 'voiture' ? raw : 'maison';
}

/** Version d'âge choisie depuis le catalogue (?bande=12-14) ; null → celle de l'enfant. */
export function parseBand(raw: string | null | undefined): AgeBand | null {
  return raw === '8-11' || raw === '12-14' || raw === '15-17' ? raw : null;
}

/** Âge révolu à `now`, ou null si la date de naissance est inconnue ou illisible. */
export function ageFromBirthDate(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(`${dob.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Remplace {prenom}, {minutes}, {extra}, {duree}, {date}… dans un gabarit de guide.ts. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
}

/** « mardi 14 octobre » */
export function formatLongDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
}
/** « 14 octobre 2027 » */
export function formatFullDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function inOneYear(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

// ── Lignes de la base (miroir de la migration 062) ───────────────────────────
export type P3Capture = { kind: CaptureKind; items?: string[]; text?: string };
export type P3Checkin = { emotion?: string; corps?: string; tete?: string };
export type P3Outcome = 'ACCROCHE' | 'MOYEN' | 'PAS_CE_SOIR';

export type P3MomentRow = Moment & {
  week: number;
  kept_phrase: string | null;
  capture: P3Capture | null;
  place?: Place | null;
  outcome?: P3Outcome | null;
};

export type P3RewardRow = { reward_id: RewardId; payload: Record<string, unknown> | null; earned_at: string };
export type P3SavedKind = 'FAVORI' | 'DE_COTE';
export type P3SavedRow = { activity_id: string; kind: P3SavedKind };
export type P3SkipReason = 'REFUS_ENFANT' | 'AUTRE_ACTIVITE' | 'PAS_LE_TEMPS';
export type P3SkipRow = { activity_id: string; reason: P3SkipReason; created_at: string };

const rowKey = (m: { activity_id: string; created_at: string }) => `${m.activity_id}|${m.created_at}`;

/** Union base + copie locale (moments notés pendant une indisponibilité), du plus récent au plus ancien. */
export function mergeMoments(remote: P3MomentRow[], local: P3MomentRow[]): P3MomentRow[] {
  const seen = new Map<string, P3MomentRow>();
  for (const r of [...remote, ...local]) if (!seen.has(rowKey(r))) seen.set(rowKey(r), r);
  return [...seen.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function mergeRewards(remote: P3RewardRow[], local: P3RewardRow[]): P3RewardRow[] {
  const seen = new Map<string, P3RewardRow>();
  for (const r of [...remote, ...local]) if (!seen.has(r.reward_id)) seen.set(r.reward_id, r);
  return [...seen.values()].sort((a, b) => a.earned_at.localeCompare(b.earned_at));
}

/** Texte lisible d'une capture (liste jointe ou texte libre). */
export function captureText(c: P3Capture | null | undefined): string | null {
  if (!c) return null;
  const items = (c.items ?? []).map((s) => s.trim()).filter(Boolean);
  if (items.length) return items.join(' · ');
  return c.text?.trim() || null;
}

export function captureItems(c: P3Capture | null | undefined): string[] {
  if (!c) return [];
  const items = (c.items ?? []).map((s) => s.trim()).filter(Boolean);
  if (items.length) return items;
  return c.text?.trim() ? [c.text.trim()] : [];
}

/** Dernière capture non vide d'une fiche (les moments arrivent du plus récent au plus ancien ou non : on trie). */
function latest<T>(moments: P3MomentRow[], id: string, pick: (m: P3MomentRow) => T | null): T | null {
  const sorted = moments.filter((m) => m.activity_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const m of sorted) {
    const v = pick(m);
    if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return null;
}

/**
 * Charge utile d'une récompense, assemblée depuis le carnet au moment où elle
 * est gagnée. Figée ensuite (règle 4) : la table n'a ni update ni delete.
 * Le corps d'une lettre n'y figure JAMAIS (seulement sa date de scellement).
 */
export function buildRewardPayload(
  id: RewardId,
  moments: P3MomentRow[],
  ctx: { earned?: ReadonlyMap<RewardId, Record<string, unknown> | null>; sealedAt?: string | null } = {},
): Record<string, unknown> | null {
  const cap = (a: string) => latest(moments, a, (m) => captureItems(m.capture));
  const kept = (a: string) => latest(moments, a, (m) => m.kept_phrase?.trim() || null);
  switch (id) {
    case 'fiche_identite':
      return {
        forces: cap('ACT-0101') ?? [],
        choix: cap('ACT-0102') ?? [],
        reve: cap('ACT-0103') ?? (kept('ACT-0103') ? [kept('ACT-0103')] : []),
      };
    case 'bilan_mi_parcours':
      return {
        podium: cap('ACT-0701') ?? [],
        objectif: cap('ACT-0702') ?? [],
        vu_par_le_parent: kept('ACT-0703'),
      };
    case 'boite_a_outils': {
      const outils = moments
        .filter((m) => m.week >= 2 && m.week <= 11 && m.capture && ['outil', 'mot', 'personnes'].includes(m.capture.kind))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .flatMap((m) => captureItems(m.capture).map((text) => ({ kind: m.capture!.kind, text })));
      return { outils };
    }
    case 'certificat': {
      const fi = ctx.earned?.get('fiche_identite') as { forces?: string[] } | null | undefined;
      return {
        forces_s1: fi?.forces ?? cap('ACT-0101') ?? [],
        forces_s13: cap('ACT-1301') ?? [],
        a_garder: kept('ACT-1303'),
      };
    }
    case 'lettre_un_an':
      return { sealed_at: ctx.sealedAt ?? null };
    default:
      return null;
  }
}
