// Assemble le modèle de l'écran G à partir des lectures réelles (RPC + tables RLS). Fonctions PURES (testées).
import type { BilanModel } from './BilanView';
import {
  childAge, fullPassportName, joinDot, lsssDelta, wellbeing5,
  type Gauge, type Identity, type LsssPoint, type PermaPoint,
} from './bilanData';
import type { NextStepRow, PassportCard, SessionReportData } from './bilanApi';
import type { SeanceItem, SeancesModel } from './SeancesView';
import type { SessionReportModel } from './SessionReportView';
import { PHASE_TITLE, REPORT_SECTION_LABELS, asText, phaseOfSession, reportFieldLabel, sessionWhenLabel, shortDate } from './bilanData';

export type BilanInputs = {
  child: { first_name: string };
  childOptions: { id: string; label: string }[];
  activeChildId: string | null;
  parentInitial: string;
  done: number;
  coachFirst: string | null;
  pendingQuestionnaire: boolean;
  readonly: boolean;
  identity: Identity;
  card: PassportCard | null;
  gauge: Gauge | null;
  lsss: LsssPoint[];
  perma: PermaPoint[];
  steps: NextStepRow[];
  docs: { title: string }[];
  now?: Date;
};

export function buildBilanModel(i: BilanInputs): BilanModel {
  const first = i.child.first_name;
  const c = i.card;
  const quote = c?.lifeSkillGoal
    ? { text: c.lifeSkillGoal, tag: 'Compétence de vie' }
    : c?.seasonDream
      ? { text: c.seasonDream, tag: 'Rêve de saison' }
      : c?.smartGoal
        ? { text: c.smartGoal, tag: 'Objectif SMART' }
        : null;
  const age = childAge(c?.dateOfBirth, i.now);
  return {
    firstName: first,
    displayName: i.identity.nickname || first,
    fullName: fullPassportName(first, i.identity.nickname, c?.lastName ?? null),
    initial: (i.identity.nickname || first).charAt(0).toUpperCase(),
    jersey: i.identity.jersey_number,
    photoUri: c?.avatarUrl ?? null,
    accent: i.identity.accent_color,
    sportLine: joinDot([c?.sport, c?.position, age != null ? `${age} ans` : null]),
    club: c?.club ?? null,
    coachFirst: i.coachFirst,
    strength: c?.strengths[0] ?? null,
    done: i.done,
    gaugeGlobal: i.gauge ? i.gauge.global : null,
    delta: lsssDelta(i.lsss),
    wellbeing: i.perma.map((p) => wellbeing5(p.value)),
    smart: c?.smartGoal ?? null,
    toolbox: (c?.toolbox ?? []).map((t) => t.tool),
    steps: i.steps.map((s) => ({ status: s.status })),
    docs: i.docs.map((d) => d.title),
    quote,
    focusWord: c?.focusWord ?? null,
    pendingQuestionnaire: i.pendingQuestionnaire,
    readonly: i.readonly,
    childOptions: i.childOptions,
    activeChildId: i.activeChildId,
    parentInitial: i.parentInitial,
  };
}

// ── Mes séances (S) et Bilan du coach (T) ───────────────────────────────────────


export type SessionRow = {
  id: string;
  session_number: number;
  title: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
};

const OPEN_STATUS = ['IN_PROGRESS', 'SCHEDULED', 'POSTPONED', 'MISSED'];

/** Séance « prochaine » : celle en cours, sinon la première à venir (une séance manquée se replanifie). */
export function pickNextSession(sessions: SessionRow[]): SessionRow | null {
  const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number);
  return sorted.find((s) => s.status === 'IN_PROGRESS') ?? sorted.find((s) => OPEN_STATUS.includes(s.status)) ?? null;
}

// Aucun état d'échec affiché : « À replanifier » pour une séance manquée.
function subtitleOf(s: SessionRow, state: SeanceItem['state']): string {
  if (state === 'done') return s.completed_at ? `Validée par le coach · ${shortDate(s.completed_at)}` : 'Validée par le coach';
  if (s.status === 'MISSED') return 'À replanifier';
  if (s.status === 'CANCELLED') return 'Annulée';
  if (state === 'next') {
    if (s.status === 'IN_PROGRESS') return 'En cours';
    return s.scheduled_at ? sessionWhenLabel(s.scheduled_at) : 'Date à fixer avec ton coach';
  }
  if (s.status === 'POSTPONED') return 'Reportée';
  return 'À venir';
}

export function buildSeancesModel(i: {
  sessions: SessionRow[];
  reportSessionNumbers: Set<number>;
  coachFirst: string | null;
  childName: string;
  childOptions: { id: string; label: string }[];
  activeChildId: string | null;
  readonly: boolean;
}): SeancesModel {
  const next = pickNextSession(i.sessions);
  const sorted = [...i.sessions].sort((a, b) => a.session_number - b.session_number);
  const done = sorted.filter((s) => s.status === 'COMPLETED').length;
  let items: SeanceItem[] = sorted.map((s) => {
    const state: SeanceItem['state'] = s.status === 'COMPLETED' ? 'done' : next && s.id === next.id ? 'next' : 'upcoming';
    return {
      id: s.id,
      number: s.session_number,
      title: s.title,
      state,
      subtitle: subtitleOf(s, state),
      hasReport: state === 'done' && i.reportSessionNumbers.has(s.session_number),
    };
  });
  if (i.readonly) items = items.filter((it) => it.state === 'done');
  const weekday = next?.scheduled_at ? new Date(next.scheduled_at).toLocaleDateString('fr-CA', { weekday: 'long' }) : null;
  const nextLine =
    !i.readonly && next && (weekday || i.coachFirst)
      ? `Prochaine : ${[weekday, i.coachFirst ? `avec Coach ${i.coachFirst}` : null].filter(Boolean).join(' ')}`
      : null;
  return { done, nextLine, items, readonly: i.readonly, childName: i.childName, childOptions: i.childOptions, activeChildId: i.activeChildId };
}

type ParentReportSections = Record<string, unknown>;

/** Bilan du coach d'une séance : session_report (filtré côté serveur) + parent_reports (sections visibles du parent). */
export function buildReportModel(i: {
  session: SessionRow;
  rpc: SessionReportData | null;
  sections: ParentReportSections | null;
  coachFirst: string | null;
}): SessionReportModel {
  const s = i.session;
  const sec = i.sections ?? {};
  const message = i.rpc?.message ?? asText(sec.message_coach);
  let bilan: [string, string][] = (i.rpc?.bilan ?? []).map(([k, v]) => [reportFieldLabel(k), v]);
  if (bilan.length === 0) {
    bilan = Object.keys(REPORT_SECTION_LABELS)
      .filter((k) => k !== 'message_coach')
      .map((k) => [REPORT_SECTION_LABELS[k], asText(sec[k])] as [string, string | null])
      .filter((x): x is [string, string] => !!x[1]);
  }
  const phase = PHASE_TITLE[phaseOfSession(s.session_number)].split(' · ')[1];
  return {
    number: s.session_number,
    title: s.title,
    subtitle: `Séance ${s.session_number} · ${phase}`,
    dateLabel: s.completed_at ? shortDate(s.completed_at) : null,
    coachName: i.coachFirst ? `Coach ${i.coachFirst}` : null,
    coachInitial: i.coachFirst ? i.coachFirst.charAt(0).toUpperCase() : null,
    message,
    bilan,
    observations: i.rpc?.observations ?? [],
  };
}
