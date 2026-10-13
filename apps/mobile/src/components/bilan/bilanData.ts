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
/** Les 6 couleurs du passeport (J) : clés stockées en base (contrainte SQL), libellés du canevas. */
export const ACCENT_LABEL: Record<AccentKey, string> = {
  sun: 'Soleil', amber: 'Ambre', teal: 'Sauge', sky: 'Ciel', coral: 'Corail', violet: 'Violet',
};
/**
 * Palette du passeport : couleurs CHOISIES par l'enfant (données, pas thème), relevées sur l'écran J du canevas.
 * C'est la seule palette « en dur » du lot ; tout le reste vient des tokens du thème.
 */
export const PASSPORT_PALETTE: Record<AccentKey, string> = {
  sun: '#E8C700', amber: '#E08A00', teal: '#5E8C7E', sky: '#32ADE6', coral: '#E8735A', violet: '#8E6CD8',
};

export type Identity = { nickname: string | null; jersey_number: number | null; accent_color: AccentKey | null };

export function isAccentKey(v: unknown): v is AccentKey {
  return typeof v === 'string' && (ACCENT_KEYS as readonly string[]).includes(v);
}

/** Les 8 sous-échelles LSSS, dans l'ordre du canevas (écran H), avec leurs libellés. */
export const SKILL_ORDER = [
  'teamwork', 'goal_setting', 'social_skills', 'problem_solving', 'emotional_skills', 'leadership', 'time_management', 'communication',
] as const;
const SKILL_LABEL: Record<string, string> = {
  teamwork: 'Travail d’équipe',
  goal_setting: 'Fixation d’objectifs',
  social_skills: 'Habiletés sociales',
  problem_solving: 'Résolution de problèmes',
  emotional_skills: 'Habiletés émotionnelles',
  leadership: 'Leadership',
  time_management: 'Gestion du temps',
  communication: 'Communication',
};

export function skillLabel(key: string): string {
  if (SKILL_LABEL[key]) return SKILL_LABEL[key];
  const t = key.replace(/[_-]/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Compétences à afficher : l'ordre du canevas d'abord, puis toute clé inconnue. */
export function orderedSkills(bySkill: Record<string, number>): [string, number][] {
  const known = SKILL_ORDER.filter((k) => k in bySkill).map((k) => [k, Number(bySkill[k])] as [string, number]);
  const extra = Object.entries(bySkill).filter(([k]) => !(SKILL_ORDER as readonly string[]).includes(k)).map(([k, v]) => [k, Number(v)] as [string, number]);
  return [...known, ...extra];
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

// ── Mise en forme (écrans G à V) ─────────────────────────────────────────────

export const TOTAL_SESSIONS = 13;

/** Décimale à la française : 4,1 (une décimale, virgule). */
export function fmtDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

/** Entier si rond (« 4 »), sinon une décimale (« 4,5 ») : notes sur 5 du bilan. */
export function fmtNote(n: number): string {
  return Number.isInteger(n) ? String(n) : fmtDecimal(n);
}

/** Bien-être (0–100 côté serveur) → note sur 5. */
export function wellbeing5(value: number): number {
  return Math.round((Math.max(0, Math.min(100, value)) / 20) * 10) / 10;
}

/** Écart LSSS depuis le départ : dernier point − point de départ (null s'il n'y a pas deux moments). */
export function lsssDelta(points: LsssPoint[]): number | null {
  const base = points.find((p) => p.moment === 'BASELINE');
  const last = [...points].reverse().find((p) => p.moment !== 'BASELINE');
  if (!base || !last) return null;
  return Math.round(last.value - base.value);
}

/** Le moment LSSS le plus avancé qui a une valeur (libellé de sous-titre de H). */
export function lsssLatestLabel(points: LsssPoint[]): string | null {
  const last = [...LSSS_MOMENT_ORDER].reverse().find((m) => points.some((p) => p.moment === m));
  return last ? LSSS_MOMENT_LABEL[last] : null;
}

export function childAge(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

/** « Léo « Flash » Tremblay » : prénom, surnom entre guillemets français, nom. */
export function fullPassportName(first: string, nick: string | null, last: string | null): string {
  return [first, nick ? `« ${nick} »` : null, last].filter(Boolean).join(' ');
}

/** « Hockey · Ailier gauche · 11 ans » : les morceaux absents sont omis. */
export function joinDot(parts: (string | null | undefined | false)[]): string {
  return parts.filter((p): p is string => !!p).join(' · ');
}

/** Encre lisible (blanche ou sombre) sur un fond libre, au meilleur contraste. */
export function inkOn(bg: string, light: string, dark: string, contrast: (a: string, b: string) => number): string {
  return contrast(light, bg) >= contrast(dark, bg) ? light : dark;
}

export type PhaseKey = 'ANCRER' | 'DEVELOPPER' | 'INTEGRER';
export const PHASE_TITLE: Record<PhaseKey, string> = {
  ANCRER: 'Phase 1 · Ancrer',
  DEVELOPPER: 'Phase 2 · Développer',
  INTEGRER: 'Phase 3 · Intégrer',
};
/** Même découpage que le web : 1-2 Ancrer, 3-10 Développer, 11-13 Intégrer. */
export function phaseOfSession(n: number | null | undefined): PhaseKey {
  if (!n || n <= 2) return 'ANCRER';
  if (n <= 10) return 'DEVELOPPER';
  return 'INTEGRER';
}

export type SessionState = 'done' | 'next' | 'upcoming';

/** Date courte du canevas : « 3 sept. », « 15 oct. ». */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

/** « jeudi 15 oct. · 17 h 30 » (prochaine séance). */
export function sessionWhenLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'short' });
  const t = d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${t}`;
}

export type NotifBucket = 'today' | 'week' | 'older';
export const NOTIF_BUCKET_LABEL: Record<NotifBucket, string> = {
  today: 'Aujourd’hui',
  week: 'Cette semaine',
  older: 'Plus tôt',
};

/** Regroupe les notifications comme l'écran V : Aujourd'hui, Cette semaine (6 jours), Plus tôt. Ordre d'entrée conservé. */
export function groupNotifications<T extends { created_at: string }>(items: T[], now: Date = new Date()): { bucket: NotifBucket; items: T[] }[] {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const out: { bucket: NotifBucket; items: T[] }[] = [];
  for (const it of items) {
    const d = new Date(it.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startToday - day) / 86400000);
    const bucket: NotifBucket = diff <= 0 ? 'today' : diff <= 6 ? 'week' : 'older';
    const last = out[out.length - 1];
    if (last && last.bucket === bucket) last.items.push(it);
    else out.push({ bucket, items: [it] });
  }
  return out;
}

/** Heure (« 18 h 24 ») pour aujourd'hui, jour court (« mer. ») cette semaine, date courte au-delà. */
export function notifStamp(iso: string, bucket: NotifBucket): string {
  const d = new Date(iso);
  if (bucket === 'today') return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  if (bucket === 'week') return d.toLocaleDateString('fr-CA', { weekday: 'short' });
  return shortDate(iso);
}

/** Libellé d'un champ du bilan détaillé (« travaillé » → « Travaillé »). */
export function reportFieldLabel(key: string): string {
  const k = key.replace(/[_-]/g, ' ').trim();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

export type StepStatus = 'todo' | 'doing' | 'done';
/** « 1 à faire · 1 en cours · 1 faite » : seuls les compteurs non nuls sont dits. */
export function stepsSummary(steps: { status: StepStatus }[]): string {
  const n = (s: StepStatus) => steps.filter((x) => x.status === s).length;
  const parts: string[] = [];
  if (n('todo')) parts.push(`${n('todo')} à faire`);
  if (n('doing')) parts.push(`${n('doing')} en cours`);
  if (n('done')) parts.push(`${n('done')} faite${n('done') > 1 ? 's' : ''}`);
  return parts.join(' · ');
}
