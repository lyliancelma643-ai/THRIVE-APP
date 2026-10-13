// Logique PURE du mode activité (GO 4 · L4, écrans M1…M17). Aucune dépendance React ni réseau : testée dans flow.test.ts.
//
// Principe de l'app d'origine : ce n'est pas un lecteur pause/lecture mais un flot où CHAQUE TAP AJOUTE le contenu
// suivant en dessous, un pas à la fois, JAMAIS automatiquement. Le réducteur ne fait donc avancer quoi que ce soit que
// sur un évènement explicite du parent ; seul l'écran « N minutes avec {enfant}. » est temporisé (1 s, comme le web).
//
// Les écritures (enregistrer le moment, sceller la lettre) ne sont jamais faites ici : le réducteur renvoie des
// EFFETS (`record`, `seal-letter`, `exit`) que l'écran exécute. « Non » à « Enregistrer ce moment ? » ne produit
// donc aucun effet d'écriture, ce que le test vérifie.
import {
  CHECKIN,
  CLOSING_SCREEN,
  DEBRIEF,
  OVERTIME_LINE,
  PRIDE_LINES,
  fill,
  inOneYear,
  isWeekComplete,
  momentsCount,
  newlyEarned,
  weeklyProgress,
  type Duration,
  type Moment,
  type P3Activity,
  type P3Checkin,
  type P3Outcome,
  type Place,
  type RewardId,
  type StepBeat,
  type StepGuide,
  type StepTimer,
} from '../../lib/p3';

// ── Écrans ──────────────────────────────────────────────────────────────────
export type FlowScreen =
  | 'checkin' // M1
  | 'rappel' // M2
  | 'lecture' // M6 (en voiture : lire avant de partir)
  | 'amorce' // M3
  | 'deroule' // M, M5 (+ M4 plein écran, M14 feuille « À garder », M15/M16 lettre)
  | 'route' // M7 (en voiture : la route)
  | 'debrief' // M8
  | 'cloture' // M9
  | 'minutes' // M10
  | 'synthese' // M11
  | 'fin'; // M12, M13

export type PlaceChoice = Exclude<Place, 'partout'>;

/** Lieu choisi par le parent (paramètre de route `lieu`) : « maison » par défaut. */
export function parsePlaceChoice(raw: string | null | undefined): PlaceChoice {
  return raw === 'exterieur' || raw === 'voiture' ? raw : 'maison';
}

// ── Typographie française ───────────────────────────────────────────────────
/** L'espace avant ? ! : ; » et après « devient insécable (comme InlineMd côté web). */
export function frTypo(text: string): string {
  return text.replace(/«\s+/g, '« ').replace(/\s+([?!:;»])/g, ' $1');
}

export type TextRun = { text: string; bold: boolean };

/** Le seul markdown inline des fiches : **gras**. Renvoie des morceaux à rendre dans un `<Text>`. */
export function splitBold(text: string): TextRun[] {
  return frTypo(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith('**') && p.endsWith('**') ? { text: p.slice(2, -2), bold: true } : { text: p, bold: false }));
}

// ── Check-in (M1) ───────────────────────────────────────────────────────────
export type CheckinAxis = (typeof CHECKIN.axes)[number];
export const CHECKIN_AXES: readonly CheckinAxis[] = CHECKIN.axes;
export type CheckinAnswers = Record<string, string>;

/** Les questions sont ajoutées une à une : autant que de réponses déjà données, plus une. */
export function shownAxisCount(answers: CheckinAnswers): number {
  return Math.min(CHECKIN_AXES.length, Object.keys(answers).length + 1);
}

/** Enregistre une réponse. Une question pas encore affichée ou une option inconnue sont ignorées. */
export function answerCheckin(answers: CheckinAnswers, axisId: string, optionId: string): CheckinAnswers {
  const index = CHECKIN_AXES.findIndex((a) => a.id === axisId);
  if (index < 0 || index >= shownAxisCount(answers)) return answers;
  if (!CHECKIN_AXES[index].options.some((o) => o.id === optionId)) return answers;
  return { ...answers, [axisId]: optionId };
}

export const checkinComplete = (answers: CheckinAnswers) => CHECKIN_AXES.every((a) => answers[a.id]);

/** « Continuer » n'apparaît qu'une fois les trois réponses données. */
export const canContinueCheckin = checkinComplete;

/** « Passer » est possible à CHAQUE question, y compris avant la première réponse (le check-in n'est jamais exigé). */
export function canSkipCheckin(_answers: CheckinAnswers): boolean {
  return true;
}

/** Réponses à enregistrer : seulement celles données, jamais de chiffre. */
export function checkinRow(answers: CheckinAnswers): P3Checkin | null {
  return Object.keys(answers).length ? (answers as P3Checkin) : null;
}

// ── Déroulé (M, M5) ─────────────────────────────────────────────────────────
export type FlatBeat = { step: number; k: number; beat: StepBeat };

/** Déroulé à plat : chaque « temps » (faire / dire) sait à quelle étape il appartient. */
export function flattenGuide(guide: readonly StepGuide[]): FlatBeat[] {
  return guide.flatMap((g, step) => g.beats.map((beat, k) => ({ step, k, beat })));
}

/** Un tap sur « Suivant » ajoute UN temps, jamais plus, jamais tout seul. */
export const revealNext = (revealed: number, total: number) => Math.min(Math.max(1, total), revealed + 1);
export const revealPrev = (revealed: number) => Math.max(1, revealed - 1);
export const allRevealed = (revealed: number, total: number) => revealed >= total;

/** Index de la dernière étape visible (les étapes se révèlent avec leurs temps). */
export function visibleStepIndex(flat: readonly FlatBeat[], revealed: number): number {
  return flat[Math.min(revealed, flat.length) - 1]?.step ?? 0;
}

/** Le prochain tap ouvre-t-il une nouvelle étape ? (libellé « Étape suivante ») */
export function nextIsNewStep(flat: readonly FlatBeat[], revealed: number): boolean {
  return revealed < flat.length && flat[revealed]?.step !== flat[revealed - 1]?.step;
}

/** Temps déjà révélés d'une étape. */
export function revealedBeatsOfStep(flat: readonly FlatBeat[], step: number, revealed: number): FlatBeat[] {
  return flat.slice(0, revealed).filter((f) => f.step === step);
}

// ── Extensions : « Vous avez encore envie, tous les deux ? » (M5) ───────────
export const EXT_LABELS = { approfondir: 'Approfondir', ancrer: 'Ancrer', transferer: 'Transférer' } as const;
export type ExtState = { open: number[]; extraMinutes: number; boost: number };
export const EXT_INITIAL: ExtState = { open: [], extraMinutes: 0, boost: 0 };

/** Un palier n'est proposé qu'une fois le précédent ouvert. */
export const extensionVisible = (open: readonly number[], i: number) => i === 0 || open.includes(i - 1);
/** Prévu dans le temps choisi (aucune minute ajoutée) ou +10 min au minuteur. */
export const extensionPlanned = (ext: { adds_to: number }, baseDuration: number) => ext.adds_to <= baseDuration;

/** Ouvre un palier : anime le minuteur et ajoute 10 min si elles n'étaient pas prévues (plafond 30 min au total). */
export function openExtension(
  s: ExtState,
  i: number,
  extensions: readonly { adds_to: number }[],
  baseDuration: number,
): ExtState {
  const ext = extensions[i];
  if (!ext || s.open.includes(i) || !extensionVisible(s.open, i)) return s;
  const planned = extensionPlanned(ext, baseDuration);
  return {
    open: [...s.open, i],
    boost: s.boost + 1,
    extraMinutes: planned ? s.extraMinutes : Math.min(30 - baseDuration, s.extraMinutes + 10),
  };
}

/** Durée jouée annoncée au minuteur : jamais plus de 30 min. */
export const playedDuration = (base: number, extra: number): Duration => Math.min(30, base + extra) as Duration;

// ── Minuteur du moment (TimerRing) ──────────────────────────────────────────
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const remainingOf = (elapsedS: number, totalS: number) => Math.max(0, totalS - elapsedS);
/** À 2 minutes de la fin, l'anneau change simplement de teinte (jamais de son ni de rouge). */
export const nearEnd = (elapsedS: number, totalS: number) => elapsedS >= totalS - 120;
export const ringRatio = (elapsedS: number, totalS: number) => (totalS <= 0 ? 0 : Math.min(1, Math.max(0, elapsedS / totalS)));
/** Minutes de dépassement : « 3 minutes de plus — tant mieux. » */
export const overtimeMinutes = (elapsedS: number, totalS: number) => Math.max(0, Math.floor((elapsedS - totalS) / 60));
export function overtimeLine(extra: number): string {
  return fill(OVERTIME_LINE, { extra }).replace(/^1 minutes/, '1 minute');
}

/** Secondes écoulées du temps 3 (figées dès que l'activité est terminée). */
export function elapsedSeconds(startedAt: number | null, endedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.max(0, Math.round(((endedAt ?? now) - startedAt) / 1000));
}
export const minutesPlayed = (elapsedS: number) => Math.max(1, Math.round(elapsedS / 60));

/** « 12 minutes avec Léa. » — accordé au singulier pour une seule minute. */
export function closingLine(minutes: number, prenom: string): string {
  const line = fill(CLOSING_SCREEN, { minutes, prenom });
  return minutes === 1 ? line.replace('1 minutes', '1 minute') : line;
}

// ── Minuteur de jeu (M4) ────────────────────────────────────────────────────
export const STEP_TIMER_LEAD_IN = 3;

export type StepTimerPosition = {
  /** « Prêt ? 3, 2, 1 » */
  lead: boolean;
  finished: boolean;
  round: number;
  phaseIndex: number;
  /** Secondes restantes dans la phase. */
  left: number;
  /** -1 pendant le « Prêt ? », 999 une fois fini : change à chaque phase (déclenche la vibration). */
  globalPhase: number;
  /** Compte à rebours du « Prêt ? ». */
  leadLeft: number;
};

const secondsLabel = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/** « 5 × (5 s + 5 s) » */
export function timerSummary(t: StepTimer): string {
  const one = t.phases.map((p) => secondsLabel(p.seconds)).join(' + ');
  return t.rounds > 1 ? `${t.rounds} × ${t.phases.length > 1 ? `(${one})` : one}` : one;
}
export { secondsLabel };

/** Position du minuteur de jeu `t` secondes après le lancement (lancé UNE fois, il enchaîne seul phases et tours). */
export function stepTimerAt(timer: StepTimer, t: number): StepTimerPosition {
  const cycle = timer.phases.reduce((n, p) => n + p.seconds, 0);
  const total = cycle * timer.rounds;
  const lead = t < STEP_TIMER_LEAD_IN;
  const tt = Math.max(0, t - STEP_TIMER_LEAD_IN);
  const finished = !lead && tt >= total;
  let round = 0;
  let phaseIndex = 0;
  let left = 0;
  if (!lead && !finished && cycle > 0) {
    round = Math.floor(tt / cycle);
    let inCycle = tt - round * cycle;
    while (phaseIndex < timer.phases.length - 1 && inCycle >= timer.phases[phaseIndex].seconds) {
      inCycle -= timer.phases[phaseIndex].seconds;
      phaseIndex += 1;
    }
    left = Math.ceil(timer.phases[phaseIndex].seconds - inCycle);
  }
  return {
    lead,
    finished,
    round,
    phaseIndex,
    left,
    globalPhase: lead ? -1 : finished ? 999 : round * timer.phases.length + phaseIndex,
    leadLeft: Math.max(0, Math.ceil(STEP_TIMER_LEAD_IN - t)),
  };
}

// ── Débrief (M8) ────────────────────────────────────────────────────────────
/** Les questions s'ajoutent l'une sous l'autre ; « Passer » et « Question suivante » avancent pareil. */
export function advanceDebrief(shown: number, total: number): { shown: number; done: boolean } {
  return shown < total ? { shown: shown + 1, done: false } : { shown, done: true };
}
export const debriefLabel = (kind: keyof typeof DEBRIEF.labels) => DEBRIEF.labels[kind];

// ── Lettre à moi-même (séance 13) : M15 → M16 ───────────────────────────────
export type LetterStep = 'write' | 'confirm' | 'sealing' | 'sealed' | 'paper';
export type LetterState = { step: LetterStep; text: string; sealedAt: number | null };
export const LETTER_INITIAL: LetterState = { step: 'write', text: '', sealedAt: null };

/** Date d'ouverture : un an après le scellement. */
export const letterOpensAt = (sealedAt: number | Date): Date => inOneYear(new Date(sealedAt));

/**
 * Règle de lecture, la même que la base (RLS) : une lettre scellée ne se lit pas avant un an après son scellement,
 * pas même par son auteur. Tant qu'elle n'est pas scellée (`sealedAt` nul), elle est encore sous les yeux de son auteur.
 */
export function canReadLetter(sealedAt: number | null, now: number): boolean {
  if (sealedAt === null) return true;
  return now >= letterOpensAt(sealedAt).getTime();
}

// ── Réducteur du flot ───────────────────────────────────────────────────────
export type FlowCtx = {
  inCar: boolean;
  /** « La fois d'avant » ou la phrase d'ouverture de la semaine existent. */
  hasRecall: boolean;
  flatLength: number;
  debriefLength: number;
  baseDuration: number;
  extensions: readonly { adds_to: number }[];
  isLetter: boolean;
};

export type FlowState = {
  screen: FlowScreen;
  checkin: CheckinAnswers;
  revealed: number;
  ext: ExtState;
  debriefShown: number;
  debriefAnswers: Record<number, string>;
  startedAt: number | null;
  endedAt: number | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  outcome: P3Outcome | null;
  kept: string;
  noteOpen: boolean;
  captureItems: string[];
  captureText: string;
  quitAsk: boolean;
  /** Une écriture est partie : plus aucun second enregistrement. */
  recording: boolean;
  recorded: boolean;
  skipped: boolean;
  letter: LetterState;
};

export type FlowEvent =
  | { t: 'checkin.answer'; axis: string; option: string }
  | { t: 'checkin.leave' } // « Continuer » ou « Passer »
  | { t: 'rappel.next' }
  | { t: 'lecture.read' }
  | { t: 'activity.start'; now: number }
  | { t: 'beat.next' }
  | { t: 'beat.prev' }
  | { t: 'ext.open'; index: number }
  | { t: 'activity.finish'; now: number }
  | { t: 'debrief.answer'; index: number; text: string }
  | { t: 'debrief.next' } // « Question suivante » ou « Passer »
  | { t: 'cloture.done' }
  | { t: 'minutes.elapsed' }
  | { t: 'synthese.rating'; rating: 1 | 2 | 3 | 4 | 5 | null }
  | { t: 'synthese.outcome'; outcome: P3Outcome | null }
  | { t: 'synthese.kept'; text: string }
  | { t: 'synthese.save'; skipped: boolean } // « Garder ce moment » / « Passer »
  | { t: 'record.done' }
  | { t: 'record.failed' }
  | { t: 'note.open' }
  | { t: 'note.close' }
  | { t: 'note.items'; items: string[] }
  | { t: 'note.text'; text: string }
  | { t: 'letter.edit'; text: string }
  | { t: 'letter.review' } // « Sceller la lettre » : ouvre la confirmation, n'écrit rien
  | { t: 'letter.back' } // « Revenir »
  | { t: 'letter.seal' } // « Sceller » : seule étape qui écrit
  | { t: 'letter.sealed'; at: number }
  | { t: 'letter.failed' }
  | { t: 'quit.request' }
  | { t: 'quit.cancel' } // fermer la feuille sans répondre : on reste dans l'activité
  | { t: 'quit.answer'; answer: 'oui' | 'non'; now: number };

export type FlowEffect =
  | { type: 'record'; skipped: boolean }
  | { type: 'seal-letter'; body: string }
  | { type: 'exit'; to: 'fiche' | 'home' };

export function initialFlow(): FlowState {
  return {
    screen: 'checkin',
    checkin: {},
    revealed: 1,
    ext: EXT_INITIAL,
    debriefShown: 1,
    debriefAnswers: {},
    startedAt: null,
    endedAt: null,
    rating: null,
    outcome: null,
    kept: '',
    noteOpen: false,
    captureItems: ['', '', ''],
    captureText: '',
    quitAsk: false,
    recording: false,
    recorded: false,
    skipped: false,
    letter: LETTER_INITIAL,
  };
}

export const screenAfterCheckin = (c: Pick<FlowCtx, 'hasRecall' | 'inCar'>): FlowScreen =>
  c.hasRecall ? 'rappel' : c.inCar ? 'lecture' : 'amorce';
export const screenAfterRappel = (c: Pick<FlowCtx, 'inCar'>): FlowScreen => (c.inCar ? 'lecture' : 'amorce');

type Step = { state: FlowState; effects: FlowEffect[] };
const same = (state: FlowState): Step => ({ state, effects: [] });
const to = (state: FlowState, patch: Partial<FlowState>, effects: FlowEffect[] = []): Step => ({
  state: { ...state, ...patch },
  effects,
});

/**
 * Transitions du mode activité. Tout est explicite : aucun évènement n'est émis par le temps, sauf `minutes.elapsed`
 * (l'écran « N minutes avec {enfant}. » reste une seconde seul à l'écran).
 */
export function flowReduce(s: FlowState, e: FlowEvent, c: FlowCtx): Step {
  switch (e.t) {
    case 'checkin.answer':
      return s.screen === 'checkin' ? to(s, { checkin: answerCheckin(s.checkin, e.axis, e.option) }) : same(s);
    case 'checkin.leave':
      return s.screen === 'checkin' ? to(s, { screen: screenAfterCheckin(c) }) : same(s);
    case 'rappel.next':
      return s.screen === 'rappel' ? to(s, { screen: screenAfterRappel(c) }) : same(s);
    case 'lecture.read':
      return s.screen === 'lecture' ? to(s, { screen: 'amorce' }) : same(s);
    case 'activity.start':
      if (s.screen !== 'amorce' && s.screen !== 'lecture') return same(s);
      return to(s, { startedAt: e.now, endedAt: null, revealed: 1, screen: c.inCar ? 'route' : 'deroule' });
    case 'beat.next':
      return s.screen === 'deroule' ? to(s, { revealed: revealNext(s.revealed, c.flatLength) }) : same(s);
    case 'beat.prev':
      return s.screen === 'deroule' ? to(s, { revealed: revealPrev(s.revealed) }) : same(s);
    case 'ext.open': {
      if (s.screen !== 'deroule' || !allRevealed(s.revealed, c.flatLength)) return same(s);
      return to(s, { ext: openExtension(s.ext, e.index, c.extensions, c.baseDuration) });
    }
    case 'activity.finish':
      if (s.screen !== 'deroule' && s.screen !== 'route') return same(s);
      return to(s, { endedAt: s.endedAt ?? e.now, noteOpen: false, debriefShown: 1, screen: 'debrief' });
    case 'debrief.answer':
      return to(s, { debriefAnswers: { ...s.debriefAnswers, [e.index]: e.text } });
    case 'debrief.next': {
      if (s.screen !== 'debrief') return same(s);
      const a = advanceDebrief(s.debriefShown, c.debriefLength);
      return to(s, a.done ? { screen: 'cloture' } : { debriefShown: a.shown });
    }
    case 'cloture.done':
      return s.screen === 'cloture' ? to(s, { screen: 'minutes' }) : same(s);
    case 'minutes.elapsed':
      return s.screen === 'minutes' ? to(s, { screen: 'synthese' }) : same(s);
    case 'synthese.rating':
      return to(s, { rating: e.rating });
    case 'synthese.outcome':
      return to(s, { outcome: e.outcome });
    case 'synthese.kept':
      return to(s, { kept: e.text });
    case 'synthese.save':
      if (s.screen !== 'synthese' || s.recording || s.recorded) return same(s);
      return to(s, { recording: true, skipped: e.skipped }, [{ type: 'record', skipped: e.skipped }]);
    case 'record.done':
      return to(s, { recording: false, recorded: true, screen: 'fin' });
    case 'record.failed':
      return to(s, { recording: false });
    case 'note.open':
      return to(s, { noteOpen: true });
    case 'note.close':
      return to(s, { noteOpen: false });
    case 'note.items':
      return to(s, { captureItems: e.items });
    case 'note.text':
      return to(s, { captureText: e.text });
    case 'letter.edit':
      return s.letter.step === 'write' ? to(s, { letter: { ...s.letter, text: e.text } }) : same(s);
    case 'letter.review':
      // La confirmation est obligatoire : rien ne part sans elle, et une lettre vide ne se scelle pas.
      return s.letter.step === 'write' && s.letter.text.trim()
        ? to(s, { letter: { ...s.letter, step: 'confirm' } })
        : same(s);
    case 'letter.back':
      // Une fois « Sceller » touché, il n'y a plus de retour : c'est irréversible.
      return s.letter.step === 'confirm' ? to(s, { letter: { ...s.letter, step: 'write' } }) : same(s);
    case 'letter.seal':
      if (s.letter.step !== 'confirm') return same(s);
      return to(s, { letter: { ...s.letter, step: 'sealing' } }, [{ type: 'seal-letter', body: s.letter.text }]);
    case 'letter.sealed':
      // Le texte est effacé de la mémoire de l'écran (R12) : plus rien à relire avant la date.
      return s.letter.step === 'sealing' ? to(s, { letter: { step: 'sealed', text: '', sealedAt: e.at } }) : same(s);
    case 'letter.failed':
      return s.letter.step === 'sealing' ? to(s, { letter: { step: 'paper', text: '', sealedAt: null } }) : same(s);
    case 'quit.request':
      // Fin, ou rien commencé : on sort sans question. Synthèse : on garde le temps joué sans rien noter.
      if (s.screen === 'fin') return to(s, {}, [{ type: 'exit', to: 'home' }]);
      if (s.startedAt === null) return to(s, {}, [{ type: 'exit', to: 'fiche' }]);
      if (s.screen === 'synthese' || s.screen === 'minutes') {
        if (s.recording || s.recorded) return same(s);
        return to(s, { recording: true, skipped: true }, [{ type: 'record', skipped: true }]);
      }
      return to(s, { quitAsk: true });
    case 'quit.cancel':
      return s.quitAsk ? to(s, { quitAsk: false }) : same(s);
    case 'quit.answer':
      if (!s.quitAsk) return same(s);
      // « Non » : on ne garde rien (aucun effet d'écriture). « Oui » : le temps joué compte, on passe par la fin.
      if (e.answer === 'non') return to(s, { quitAsk: false }, [{ type: 'exit', to: 'home' }]);
      return to(s, { quitAsk: false, endedAt: s.endedAt ?? e.now, noteOpen: false, screen: 'minutes' });
  }
}

// ── Enregistrement (E5) ─────────────────────────────────────────────────────
export type CaptureRow = { kind: string; items?: string[]; text?: string };

/** Ce que l'enfant a noté. Le corps d'une lettre ne quitte jamais p3_letters. */
export function buildCapture(
  capture: P3Activity['capture'],
  isLetter: boolean,
  items: readonly string[],
  text: string,
): CaptureRow | null {
  if (!capture || isLetter) return null;
  const kept = items.map((i) => i.trim()).filter(Boolean);
  if (capture.kind === 'forces') return kept.length ? { kind: 'forces', items: kept } : null;
  return text.trim() ? { kind: capture.kind, text: text.trim() } : null;
}

export type MomentPayload = {
  activityId: string;
  week: number;
  duration_chosen: Duration;
  duration_real_s: number | null;
  place: PlaceChoice;
  checkin: P3Checkin | null;
  debrief: { kind: string; answer: string }[] | null;
  capture: CaptureRow | null;
  kept_phrase: string | null;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  outcome: P3Outcome | null;
};

/** Ligne de p3_moments. « Passer » (skipped) ne garde ni note, ni ressenti, ni phrase, mais le temps joué compte. */
export function buildMomentPayload(
  s: FlowState,
  input: {
    activity: P3Activity;
    debrief: readonly { kind: string }[];
    baseDuration: number;
    place: PlaceChoice;
    skipped: boolean;
    now: number;
  },
): MomentPayload {
  const rows = input.debrief
    .map((d, i) => ({ kind: d.kind, answer: (s.debriefAnswers[i] ?? '').trim() }))
    .filter((d) => d.answer);
  return {
    activityId: input.activity.id,
    week: input.activity.week as number,
    duration_chosen: playedDuration(input.baseDuration, s.ext.extraMinutes),
    duration_real_s: s.startedAt !== null ? Math.round(((s.endedAt ?? input.now) - s.startedAt) / 1000) : null,
    place: input.place,
    checkin: checkinRow(s.checkin),
    debrief: rows.length ? rows : null,
    capture: buildCapture(input.activity.capture, input.activity.capture?.kind === 'lettre', s.captureItems, s.captureText),
    kept_phrase: input.skipped ? null : s.kept.trim() || null,
    rating: input.skipped ? null : s.rating,
    outcome: input.skipped ? null : s.outcome,
  };
}

// ── Écran de fin (M12, M13) ─────────────────────────────────────────────────
export type EndSummary = {
  /** Compteur avant ce moment (le compteur « monte » de là au total). */
  countBefore: number;
  count: number;
  /** Étoiles allumées cette semaine (0 à 3). */
  weekStars: number;
  newRewards: RewardId[];
  weekJustDone: boolean;
  /** Le parent a donné au moins une réponse : le compteur « monte » (sinon affiché directement). */
  answered: boolean;
  low: boolean;
  prideKey: 'done' | 'notReally';
};

/** Compteurs et objets débloqués APRÈS ce moment, calculés depuis les moments déjà connus (jamais depuis une démo). */
export function summarizeAfter(input: {
  before: readonly Moment[];
  after: Moment;
  activity: Pick<P3Activity, 'programme' | 'week'>;
  now: Date;
  skipped: boolean;
  rating: 1 | 2 | 3 | 4 | 5 | null;
  outcome: P3Outcome | null;
  kept: string;
}): EndSummary {
  const moments = [input.after, ...input.before];
  const doneBefore = new Set(input.before.map((m) => m.activity_id));
  const doneAfter = new Set(moments.map((m) => m.activity_id));
  const earnedBefore = new Set(
    newlyEarned({ alreadyEarned: new Set(), doneIds: doneBefore, momentsTotal: momentsCount([...input.before]), subscriptionMonths: 0 }),
  );
  const newRewards = newlyEarned({
    alreadyEarned: earnedBefore,
    doneIds: doneAfter,
    momentsTotal: momentsCount(moments),
    subscriptionMonths: 0,
  });
  const answered = !input.skipped && (input.rating !== null || input.outcome !== null || input.kept.trim() !== '');
  const low = !input.skipped && input.rating !== null && input.rating <= 2;
  return {
    countBefore: momentsCount([...input.before]),
    count: momentsCount(moments),
    weekStars: Math.min(weeklyProgress(moments, input.now).done, 3),
    newRewards,
    // Seule une fiche cœur peut compléter une semaine : un complément ou un bonus ne la « refinit » pas.
    weekJustDone:
      input.activity.programme === 'coeur' && input.activity.week !== null ? isWeekComplete(input.activity.week, doneAfter) : false,
    answered,
    low,
    prideKey: low ? 'notReally' : 'done',
  };
}

export const prideLine = (k: EndSummary['prideKey']) => PRIDE_LINES[k];

/** « 12 moments avec Léa » (1 moment au singulier). */
export const countLine = (count: number, prenom: string) => (count === 1 ? `1 moment avec ${prenom}` : `${count} moments avec ${prenom}`);

/** Pas du compteur qui monte (≤ 2 s) : de `before` à `target`. Vide si rien à animer. */
export function counterSteps(before: number, target: number): number[] {
  if (target <= before) return [target];
  const out: number[] = [];
  for (let n = before; n <= target; n += 1) out.push(n);
  return out;
}

/** Libellé « 18 minutes avec {enfant}, jusqu’ici. » de la feuille « Enregistrer ce moment ? ». */
export function quitSubtitle(minutes: number, prenom: string): string {
  return closingLine(minutes, prenom).replace(/\.$/, ', jusqu’ici.');
}
