// Page Bilan (G) : ordre des cartes, droits d'analyse (forfait Groupe), parcours, lettre et certificat.
// Fonctions PURES (testées). Rien n'est recalculé côté client : les mesures (LSSS, bien-être, jauge) viennent des RPC
// lues par bilanApi.ts ; ici on ne fait que mettre en forme ce que le serveur a déjà décidé.
import type { ProgramPack } from '../../services/programPayments';
import { can, type Pack } from '../../lib/packs';
import { TOTAL_SESSIONS, sessionWhenLabel } from './bilanData';
import type { Gauge, LsssPoint, PermaPoint } from './bilanData';
import type { DocRow, NextStepRow, PassportCard } from './bilanApi';

/** Libellé de l'échelle de bien-être tel qu'il est écrit dans le produit (web : bilan-html, page, questionnaire). Le code interne `PERMA` n'est jamais affiché. */
export const WELLBEING_SCALE = 'EPOCH';

/** Cartes de la page, dans l'ordre exact de la page web (`bilan-html.ts`). */
export const CARD_ORDER = [
  'rappels', 'programme', 'passeport', 'competences', 'bienetre', 'parcours', 'boite', 'etapes',
  'outils', 'identite', 'objectif', 'focus', 'emotions', 'routine', 'contrat', 'lettre', 'certificat',
] as const;
export type CardKey = (typeof CARD_ORDER)[number];

/** Clés de carte acceptées par `?focus=` (même vocabulaire que les `data-info` du web), vers une carte de la page. */
export function cardForFocus(focus: string | null | undefined): CardKey | null {
  if (!focus) return null;
  const alias: Record<string, CardKey> = {
    competences: 'competences', lsss: 'competences', perma: 'bienetre', bienetre: 'bienetre', programme: 'programme', passeport: 'passeport',
    identite: 'passeport', parcours: 'parcours', boite: 'boite', etapes: 'etapes', objectif: 'objectif', focus: 'focus', emotions: 'emotions',
    routine: 'routine', contrat: 'contrat', lettre: 'lettre', certificat: 'certificat',
  };
  return alias[focus] ?? null;
}

// ── Droits d'analyse ───────────────────────────────────────────────────────────

export type BilanRights = {
  /** Compétences détaillées (une rangée par compétence). */
  skillBreakdown: boolean;
  /** Courbe de bien-être et ses cinq dimensions. */
  wellbeingCurve: boolean;
  /** Roue des émotions. */
  emotionWheel: boolean;
};

/** Forfait vendu → code interne de la matrice partagée (`lib/packs.ts`, copie conforme du seed SQL de `plans`). */
export const PACK_TO_PLAN: Record<ProgramPack, Pack> = { groupe: 'ESSENTIEL', individuel: 'AVANCE', complet: 'PERFORMANCE' };

/**
 * Droits d'analyse lus dans la matrice partagée avec le web (aucune copie) : la courbe de bien-être suit `lsssCurve`
 * (même clé que la page web). Tout accès sans pack (forçage, équipe) ouvre tout.
 * `packPending` : l'accès vient d'un pack mais lequel n'est pas encore lu → fermé (jamais d'ouverture par défaut).
 */
export function rightsFor(pack: ProgramPack | null, packPending = false): BilanRights {
  if (packPending) return { skillBreakdown: false, wellbeingCurve: false, emotionWheel: false };
  if (pack === null) return { skillBreakdown: true, wellbeingCurve: true, emotionWheel: true };
  const plan = PACK_TO_PLAN[pack];
  return { skillBreakdown: can(plan, 'skillBreakdown'), wellbeingCurve: can(plan, 'lsssCurve'), emotionWheel: can(plan, 'emotionWheel') };
}

export function isGroupPreview(r: BilanRights): boolean {
  return !r.skillBreakdown || !r.wellbeingCurve || !r.emotionWheel;
}

/** Textes des notes de verrou de G11. Aucun lien, aucun prix : l'information seule. */
export const LOCK_NOTES = {
  skills: 'Le détail par compétence et son évolution sont inclus dès le pack Individuel.',
  wellbeing: `La courbe de bien-être ${WELLBEING_SCALE} (mesurée après chaque séance : 5 dimensions scientifiques) est incluse dès le pack Individuel.`,
  emotions: 'La roue des émotions et le suivi de séance en séance sont inclus dès le pack Individuel.',
} as const;

// ── Données complémentaires lues sur les mêmes tables que le web ───────────────

export type RawExtras = {
  sessions: { session_number: number | null; status: string; scheduled_at: string | null }[];
  identity: {
    sport_story: string | null;
    my_actions: string[];
    letter: string | null;
    program_pct_override: number | null;
    certificate_ready: boolean;
  };
  latestEmotion: string | null;
  docs: { id: string; kind: string; parent_visible: boolean }[];
  pendingWellbeing: { token: string | null; sessionNumber: number | null } | null;
};

export const EMPTY_RAW_EXTRAS: RawExtras = {
  sessions: [],
  identity: { sport_story: null, my_actions: [], letter: null, program_pct_override: null, certificate_ready: false },
  latestEmotion: null,
  docs: [],
  pendingWellbeing: null,
};

/** Pourcentage du parcours : séances validées sur 13, sauf valeur fixée par le coach (même règle que le web). */
export function programPct(completed: number, total = TOTAL_SESSIONS, override?: number | null): number {
  if (override != null) return Math.max(0, Math.min(100, override));
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export type NodeState = 'done' | 'current' | 'upcoming' | 'replan';
export type ParcoursNode = { n: number; state: NodeState; sub: string };

/**
 * Les 13 pastilles, pilotées par le statut réel de chaque séance. Aucun état d'échec : une séance manquée ou
 * reportée se replanifie (« À replanifier » / « Reportée », ton neutre).
 */
export function buildParcours(sessions: RawExtras['sessions'], completed: number) {
  const byNum: Record<number, { status: string; scheduled_at: string | null }> = {};
  for (const s of sessions) if (s.session_number != null) byNum[s.session_number] = s;
  const hasStatus = Object.keys(byNum).length > 0;
  const cur = Math.min(Math.max(completed, 0), TOTAL_SESSIONS);
  const nodes: ParcoursNode[] = [];
  for (let n = 1; n <= TOTAL_SESSIONS; n++) {
    const st = byNum[n]?.status;
    const done = hasStatus ? st === 'COMPLETED' : n <= cur;
    const isCur = !done && (hasStatus ? st === 'IN_PROGRESS' : n === cur + 1 && cur < TOTAL_SESSIONS);
    let state: NodeState = done ? 'done' : isCur ? 'current' : 'upcoming';
    let sub = n === 7 ? 'LSSS' : n === TOTAL_SESSIONS ? 'Bilan' : `S${n}`;
    if (!done && st === 'MISSED') { state = 'replan'; sub = `S${n} · à replanifier`; }
    if (!done && st === 'POSTPONED') { state = 'replan'; sub = `S${n} · reportée`; }
    nodes.push({ n, state, sub });
  }
  const doneNums = nodes.filter((x) => x.state === 'done').map((x) => x.n);
  const last = doneNums.length ? Math.max(...doneNums) : null;
  const next = nodes.find((x) => x.state !== 'done')?.n ?? null;
  const nextAt = next != null ? byNum[next]?.scheduled_at ?? null : null;
  return {
    nodes,
    doneCount: doneNums.length,
    last,
    next,
    nextWhen: nextAt ? sessionWhenLabel(nextAt) : null,
  };
}

// ── Lettre (G9) et certificat (G10) ────────────────────────────────────────────

export type LetterState = 'upcoming' | 'sealed';

/**
 * La lettre est écrite à la séance 13 puis scellée un an. Son texte n'est JAMAIS affiché dans l'app :
 * seule l'étape (à venir / scellée) et, si le coach l'a rendu visible, le document à télécharger.
 */
export function letterState(letter: string | null | undefined, hasLetterDoc: boolean): LetterState {
  return (letter && letter.trim() !== '') || hasLetterDoc ? 'sealed' : 'upcoming';
}

export type CertificateState = 'locked' | 'available';

/** Verrouillé jusqu'à la validation de la séance 13 : il faut le feu vert du coach ET le document. */
export function certificateState(ready: boolean, hasDoc: boolean): CertificateState {
  return ready && hasDoc ? 'available' : 'locked';
}

// ── Modèle complémentaire de la page ───────────────────────────────────────────

export type BilanExtras = {
  pct: number;
  completed: number;
  parcours: ReturnType<typeof buildParcours>;
  card: PassportCard | null;
  steps: NextStepRow[];
  docs: DocRow[];
  gauge: Gauge | null;
  lsss: LsssPoint[];
  perma: PermaPoint[];
  sportStory: string | null;
  myActions: string[];
  latestEmotion: string | null;
  letter: LetterState;
  certificate: CertificateState;
  docIds: { contract?: string; letter?: string; certificate?: string };
  pendingWellbeing: RawExtras['pendingWellbeing'];
  /** « 8 ateliers · N renseignés » (même décompte que le web : contrat compté d'office). */
  toolsFilled: number;
  rights: BilanRights;
};

export function buildExtras(i: {
  raw: RawExtras;
  completed: number;
  card: PassportCard | null;
  steps: NextStepRow[];
  docs: DocRow[];
  gauge: Gauge | null;
  lsss: LsssPoint[];
  perma: PermaPoint[];
  rights: BilanRights;
}): BilanExtras {
  const { raw, card: c } = i;
  const docId = (kind: string) => raw.docs.find((d) => d.kind === kind && d.parent_visible)?.id;
  const docIds = { contract: docId('CONTRACT'), letter: docId('LETTER'), certificate: docId('CERTIFICATE') };
  const idFilled = !!raw.identity.sport_story || (c?.strengths.length ?? 0) > 0 || !!c?.seasonDream;
  const objFilled = !!c?.smartGoal || !!c?.lifeSkillGoal || raw.identity.my_actions.length > 0;
  const letter = letterState(raw.identity.letter, !!docIds.letter);
  const toolsFilled = [idFilled, objFilled, !!c?.focusWord, (c?.toolbox.length ?? 0) > 0, letter === 'sealed'].filter(Boolean).length + 1;
  return {
    pct: programPct(i.completed, TOTAL_SESSIONS, raw.identity.program_pct_override),
    completed: i.completed,
    parcours: buildParcours(raw.sessions, i.completed),
    card: c,
    steps: i.steps,
    docs: i.docs,
    gauge: i.gauge,
    lsss: i.lsss,
    perma: i.perma,
    sportStory: raw.identity.sport_story,
    myActions: raw.identity.my_actions,
    latestEmotion: raw.latestEmotion,
    letter,
    certificate: certificateState(raw.identity.certificate_ready, !!docIds.certificate),
    docIds,
    pendingWellbeing: raw.pendingWellbeing,
    toolsFilled,
    rights: i.rights,
  };
}

/** Extras vides (galerie, chargement) : toutes les cartes retombent sur leur état « à venir ». */
export function emptyExtras(rights: BilanRights = rightsFor(null)): BilanExtras {
  return buildExtras({ raw: EMPTY_RAW_EXTRAS, completed: 0, card: null, steps: [], docs: [], gauge: null, lsss: [], perma: [], rights });
}
