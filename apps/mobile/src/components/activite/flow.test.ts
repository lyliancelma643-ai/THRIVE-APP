import { describe, expect, it, vi } from 'vitest';
import { P3_ACTIVITIES, getActivity, type Moment, type P3Activity } from '../../lib/p3';
import {
  CHECKIN_AXES,
  EXT_INITIAL,
  answerCheckin,
  buildCapture,
  buildMomentPayload,
  canContinueCheckin,
  canReadLetter,
  canSkipCheckin,
  closingLine,
  counterSteps,
  countLine,
  elapsedSeconds,
  flattenGuide,
  flowReduce,
  frTypo,
  initialFlow,
  letterOpensAt,
  MAX_REAL_DURATION_S,
  minutesPlayed,
  nextIsNewStep,
  parsePlaceChoice,
  openExtension,
  playedDuration,
  quitSubtitle,
  revealNext,
  revealedBeatsOfStep,
  shownAxisCount,
  splitBold,
  stepTimerAt,
  summarizeAfter,
  timerSummary,
  visibleStepIndex,
  type FlowCtx,
  type FlowEffect,
  type FlowEvent,
  type FlowState,
} from './flow';

const activity: P3Activity = P3_ACTIVITIES.find((a) => a.guide.length > 1 && a.extensions.length > 0 && a.debrief.length > 1)!;
const flat = flattenGuide(activity.guide);

const ctx = (over: Partial<FlowCtx> = {}): FlowCtx => ({
  inCar: false,
  hasRecall: true,
  flatLength: flat.length,
  debriefLength: activity.debrief.length,
  baseDuration: activity.base_duration,
  extensions: activity.extensions,
  isLetter: false,
  ...over,
});

/** Joue des évènements et garde tous les effets émis. */
function play(events: FlowEvent[], c: FlowCtx = ctx(), from: FlowState = initialFlow()) {
  let state = from;
  const effects: FlowEffect[] = [];
  for (const e of events) {
    const r = flowReduce(state, e, c);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const toDeroule: FlowEvent[] = [{ t: 'checkin.leave' }, { t: 'rappel.next' }, { t: 'activity.start', now: 1_000 }];

describe('flux : ajout pas à pas, jamais automatique', () => {
  it('un tap ajoute UN seul temps du déroulé', () => {
    expect(flat.length).toBeGreaterThan(3);
    const { state } = play([...toDeroule, { t: 'beat.next' }]);
    expect(state.screen).toBe('deroule');
    expect(state.revealed).toBe(2);
    expect(revealNext(1, flat.length)).toBe(2);
  });

  it('rien n’avance sans évènement : le temps qui passe ne révèle rien', () => {
    const a = play(toDeroule).state;
    // Le réducteur n'a aucune entrée « tick » : seuls les évènements explicites changent l'état.
    expect(a.revealed).toBe(1);
    expect(a.screen).toBe('deroule');
    expect(a.debriefShown).toBe(1);
  });

  it('le déroulé ne dépasse jamais le dernier temps', () => {
    const taps = Array.from({ length: flat.length + 5 }, () => ({ t: 'beat.next' }) as FlowEvent);
    expect(play([...toDeroule, ...taps]).state.revealed).toBe(flat.length);
  });

  it('« revenir d’un cran » retire un temps sans passer sous 1', () => {
    const s = play([...toDeroule, { t: 'beat.next' }, { t: 'beat.next' }, { t: 'beat.prev' }, { t: 'beat.prev' }, { t: 'beat.prev' }]).state;
    expect(s.revealed).toBe(1);
  });

  it('les étapes se révèlent avec leurs temps', () => {
    expect(visibleStepIndex(flat, 1)).toBe(0);
    expect(visibleStepIndex(flat, flat.length)).toBe(activity.guide.length - 1);
    const firstOfSecond = flat.findIndex((f) => f.step === 1);
    expect(nextIsNewStep(flat, firstOfSecond)).toBe(true);
    expect(revealedBeatsOfStep(flat, 0, 1)).toHaveLength(1);
  });

  it('les extensions ne s’ouvrent qu’une fois tout le déroulé affiché, une à une, et ajoutent 10 min au plus', () => {
    const early = play([...toDeroule, { t: 'ext.open', index: 0 }]).state;
    expect(early.ext.open).toEqual([]);
    const taps = Array.from({ length: flat.length }, () => ({ t: 'beat.next' }) as FlowEvent);
    const base = play([...toDeroule, ...taps]).state;
    const skipFirst = flowReduce(base, { t: 'ext.open', index: 1 }, ctx()).state;
    expect(skipFirst.ext.open).toEqual([]); // le palier 2 attend le palier 1
    const opened = flowReduce(base, { t: 'ext.open', index: 0 }, ctx({ baseDuration: 10 })).state;
    expect(opened.ext.open).toEqual([0]);
    expect(opened.ext.extraMinutes).toBe(10);
    expect(opened.ext.boost).toBe(1);
    // Déjà ouvert : sans effet.
    expect(openExtension(opened.ext, 0, activity.extensions, 10)).toBe(opened.ext);
    // Prévu dans le temps choisi : aucune minute ajoutée.
    expect(openExtension(EXT_INITIAL, 0, [{ adds_to: 20 }], 20).extraMinutes).toBe(0);
    // Jamais plus de 30 minutes au total.
    expect(playedDuration(20, 40)).toBe(30);
  });

  it('le débrief ajoute une question à la fois, « Passer » avance pareil, puis « Pour finir »', () => {
    const n = activity.debrief.length;
    let s = play([...toDeroule, { t: 'activity.finish', now: 61_000 }]).state;
    expect(s.screen).toBe('debrief');
    expect(s.debriefShown).toBe(1);
    for (let i = 1; i < n; i += 1) {
      s = flowReduce(s, { t: 'debrief.next' }, ctx()).state;
      expect(s.screen).toBe('debrief');
      expect(s.debriefShown).toBe(i + 1);
    }
    s = flowReduce(s, { t: 'debrief.next' }, ctx()).state;
    expect(s.screen).toBe('cloture');
  });

  it('le lieu par défaut est la maison', () => {
    expect(parsePlaceChoice(undefined)).toBe('maison');
    expect(parsePlaceChoice('voiture')).toBe('voiture');
    expect(parsePlaceChoice('ailleurs')).toBe('maison');
  });

  it('l’enchaînement complet ne saute aucun écran', () => {
    const seen: string[] = [];
    let state = initialFlow();
    const step = (e: FlowEvent) => {
      state = flowReduce(state, e, ctx()).state;
      seen.push(state.screen);
    };
    step({ t: 'checkin.leave' });
    step({ t: 'rappel.next' });
    step({ t: 'activity.start', now: 0 });
    step({ t: 'activity.finish', now: 1000 });
    for (let i = 0; i < activity.debrief.length; i += 1) step({ t: 'debrief.next' });
    step({ t: 'cloture.done' });
    step({ t: 'minutes.elapsed' });
    expect(seen.filter((v, i) => v !== seen[i - 1])).toEqual(['rappel', 'amorce', 'deroule', 'debrief', 'cloture', 'minutes', 'synthese']);
  });

  it('en voiture : lire, puis la route (aucun déroulé à l’écran)', () => {
    const car = ctx({ inCar: true });
    const s = play([{ t: 'checkin.leave' }, { t: 'rappel.next' }, { t: 'lecture.read' }, { t: 'activity.start', now: 5 }], car).state;
    expect(s.screen).toBe('route');
    expect(play([{ t: 'checkin.leave' }], ctx({ inCar: true, hasRecall: false })).state.screen).toBe('lecture');
    expect(play([{ t: 'checkin.leave' }], ctx({ hasRecall: false })).state.screen).toBe('amorce');
  });

  it('un évènement hors de son écran est ignoré', () => {
    const s = initialFlow();
    expect(flowReduce(s, { t: 'beat.next' }, ctx()).state).toBe(s);
    expect(flowReduce(s, { t: 'activity.finish', now: 1 }, ctx()).state).toBe(s);
    expect(flowReduce(s, { t: 'synthese.save', skipped: false }, ctx()).effects).toEqual([]);
  });
});

describe('check-in (M1) : « Passer » à chaque question', () => {
  it('une question à la fois', () => {
    expect(shownAxisCount({})).toBe(1);
    expect(shownAxisCount({ emotion: 'joie' })).toBe(2);
    expect(shownAxisCount({ emotion: 'joie', corps: 'ok' })).toBe(3);
    expect(shownAxisCount({ emotion: 'joie', corps: 'ok', tete: 'libre' })).toBe(CHECKIN_AXES.length);
  });

  it('une question pas encore affichée ne reçoit pas de réponse', () => {
    expect(answerCheckin({}, 'corps', 'ok')).toEqual({});
    expect(answerCheckin({}, 'emotion', 'inconnue')).toEqual({});
    expect(answerCheckin({}, 'emotion', 'joie')).toEqual({ emotion: 'joie' });
  });

  it('« Passer » est possible à chaque étape et quitte le check-in sans exiger de réponse', () => {
    const answersSteps: [string, string][] = [['emotion', 'calme'], ['corps', 'ok'], ['tete', 'libre']];
    for (let given = 0; given <= answersSteps.length; given += 1) {
      const events: FlowEvent[] = answersSteps.slice(0, given).map(([axis, option]) => ({ t: 'checkin.answer', axis, option }));
      const { state } = play(events);
      expect(state.screen).toBe('checkin');
      expect(canSkipCheckin(state.checkin)).toBe(true);
      const left = flowReduce(state, { t: 'checkin.leave' }, ctx());
      expect(left.state.screen).toBe('rappel');
      expect(left.effects).toEqual([]); // passer n'écrit rien
      expect(Object.keys(left.state.checkin)).toHaveLength(given);
    }
  });

  it('« Continuer » n’apparaît qu’avec les trois réponses', () => {
    expect(canContinueCheckin({ emotion: 'joie', corps: 'ok' })).toBe(false);
    expect(canContinueCheckin({ emotion: 'joie', corps: 'ok', tete: 'libre' })).toBe(true);
  });
});

describe('lettre à moi-même (séance 13) : sceller est irréversible', () => {
  const letterCtx = ctx({ isLetter: true });
  const write = (text: string): FlowEvent => ({ t: 'letter.edit', text });

  it('sceller exige la confirmation : « Sceller » sans passer par elle n’écrit rien', () => {
    const s = play([write('Cher moi de l’an prochain,')], letterCtx).state;
    const direct = flowReduce(s, { t: 'letter.seal' }, letterCtx);
    expect(direct.effects).toEqual([]);
    expect(direct.state.letter.step).toBe('write');
  });

  it('une lettre vide ne se scelle pas', () => {
    expect(play([write('   '), { t: 'letter.review' }], letterCtx).state.letter.step).toBe('write');
  });

  it('on peut revenir tant qu’on n’a pas scellé, plus après', () => {
    const confirm = play([write('Bonjour'), { t: 'letter.review' }], letterCtx).state;
    expect(confirm.letter.step).toBe('confirm');
    expect(flowReduce(confirm, { t: 'letter.back' }, letterCtx).state.letter.step).toBe('write');

    const sealing = flowReduce(confirm, { t: 'letter.seal' }, letterCtx);
    expect(sealing.effects).toEqual([{ type: 'seal-letter', body: 'Bonjour' }]);
    expect(sealing.state.letter.step).toBe('sealing');
    // Plus de retour ni de modification.
    expect(flowReduce(sealing.state, { t: 'letter.back' }, letterCtx).state.letter.step).toBe('sealing');
    expect(flowReduce(sealing.state, write('autre'), letterCtx).state.letter.text).toBe('Bonjour');
  });

  it('une fois scellée : texte effacé, pas de retour, pas de second scellement, illisible avant la date', () => {
    const at = Date.UTC(2026, 9, 13, 18, 0, 0);
    const sealed = play(
      [write('Bonjour'), { t: 'letter.review' }, { t: 'letter.seal' }, { t: 'letter.sealed', at }],
      letterCtx,
    );
    expect(sealed.state.letter).toEqual({ step: 'sealed', text: '', sealedAt: at });
    expect(sealed.effects.filter((e) => e.type === 'seal-letter')).toHaveLength(1);
    for (const e of [{ t: 'letter.back' }, { t: 'letter.seal' }, { t: 'letter.review' }, write('relire')] as FlowEvent[]) {
      const r = flowReduce(sealed.state, e, letterCtx);
      expect(r.state.letter).toEqual(sealed.state.letter);
      expect(r.effects).toEqual([]);
    }
    const opens = letterOpensAt(at);
    expect(opens.getFullYear()).toBe(2027);
    expect(canReadLetter(at, at + 1000)).toBe(false);
    expect(canReadLetter(at, opens.getTime() - 1)).toBe(false);
    expect(canReadLetter(at, opens.getTime())).toBe(true);
    expect(canReadLetter(null, at)).toBe(true); // pas encore scellée
  });

  it('si la base est indisponible : rien n’est gardé, repli papier sans état d’échec', () => {
    const r = play([write('Bonjour'), { t: 'letter.review' }, { t: 'letter.seal' }, { t: 'letter.failed' }], letterCtx).state;
    expect(r.letter).toEqual({ step: 'paper', text: '', sealedAt: null });
  });

  it('le corps de la lettre ne part jamais dans la capture du moment', () => {
    const lettre = getActivity('ACT-1302');
    expect(lettre?.capture?.kind).toBe('lettre');
    expect(buildCapture(lettre!.capture, true, ['a', 'b', 'c'], 'texte')).toBeNull();
  });
});

describe('quitter (M17) : « Enregistrer ce moment ? »', () => {
  const running: FlowEvent[] = [...toDeroule, { t: 'beat.next' }];

  it('quitter en cours de route demande, sans rien écrire', () => {
    const r = play([...running, { t: 'quit.request' }]);
    expect(r.state.quitAsk).toBe(true);
    expect(r.effects).toEqual([]);
  });

  it('« Non » ne garde rien : aucun effet d’écriture, on sort', () => {
    const record = vi.fn();
    const seal = vi.fn();
    const { effects, state } = play([...running, { t: 'quit.request' }, { t: 'quit.answer', answer: 'non', now: 99_000 }]);
    for (const e of effects) {
      if (e.type === 'record') record();
      if (e.type === 'seal-letter') seal();
    }
    expect(record).not.toHaveBeenCalled();
    expect(seal).not.toHaveBeenCalled();
    expect(effects).toEqual([{ type: 'exit', to: 'home' }]);
    expect(state.recorded).toBe(false);
    expect(state.recording).toBe(false);
  });

  it('« Oui » compte les minutes jouées puis passe par « N minutes avec {enfant}. »', () => {
    const t0 = 1_000_000;
    const { state, effects } = play([
      { t: 'checkin.leave' }, { t: 'rappel.next' }, { t: 'activity.start', now: t0 },
      { t: 'quit.request' }, { t: 'quit.answer', answer: 'oui', now: t0 + 18 * 60_000 + 20_000 },
    ]);
    expect(state.screen).toBe('minutes');
    expect(state.quitAsk).toBe(false);
    expect(effects).toEqual([]); // l'écriture suit la synthèse (« Passer » ou « Garder »)
    const minutes = minutesPlayed(elapsedSeconds(state.startedAt, state.endedAt, t0 + 999_999));
    expect(minutes).toBe(18);
    expect(closingLine(minutes, 'Léa')).toBe('18 minutes avec Léa.');
    expect(quitSubtitle(18, 'Léa')).toBe('18 minutes avec Léa, jusqu’ici.');
  });

  it('« Oui » puis « Passer » à la synthèse : un seul enregistrement, sans note ni ressenti', () => {
    const t0 = 5_000;
    const base = play([
      { t: 'checkin.leave' }, { t: 'rappel.next' }, { t: 'activity.start', now: t0 },
      { t: 'quit.request' }, { t: 'quit.answer', answer: 'oui', now: t0 + 125_000 }, { t: 'minutes.elapsed' },
      { t: 'synthese.rating', rating: 4 }, { t: 'synthese.kept', text: 'une phrase' },
    ]);
    const saved = flowReduce(base.state, { t: 'synthese.save', skipped: true }, ctx());
    expect(saved.effects).toEqual([{ type: 'record', skipped: true }]);
    // Double tap : toujours un seul enregistrement.
    expect(flowReduce(saved.state, { t: 'synthese.save', skipped: true }, ctx()).effects).toEqual([]);
    const payload = buildMomentPayload(saved.state, { activity, debrief: activity.debrief, baseDuration: 10, place: 'maison', skipped: true, now: t0 + 999_999 });
    expect(payload.duration_real_s).toBe(125);
    expect(payload.rating).toBeNull();
    expect(payload.kept_phrase).toBeNull();
    expect(payload.outcome).toBeNull();
  });

  it('avant d’avoir commencé, on sort sans question ; en fin de parcours, on retourne à Maison', () => {
    expect(play([{ t: 'quit.request' }]).effects).toEqual([{ type: 'exit', to: 'fiche' }]);
    const fin = { ...initialFlow(), screen: 'fin' as const, startedAt: 1 };
    expect(flowReduce(fin, { t: 'quit.request' }, ctx()).effects).toEqual([{ type: 'exit', to: 'home' }]);
  });

  it('quitter à la synthèse enregistre le temps joué (sans note) au lieu de le perdre', () => {
    const s = { ...initialFlow(), screen: 'synthese' as const, startedAt: 1, endedAt: 9 };
    expect(flowReduce(s, { t: 'quit.request' }, ctx()).effects).toEqual([{ type: 'record', skipped: true }]);
  });

  it('fermer la feuille sans répondre laisse le parent dans l’activité, rien n’est écrit', () => {
    const r = play([...running, { t: 'quit.request' }, { t: 'quit.cancel' }]);
    expect(r.state.quitAsk).toBe(false);
    expect(r.state.screen).toBe('deroule');
    expect(r.effects).toEqual([]);
  });

  it('une réponse sans question posée est ignorée', () => {
    expect(play([...running, { t: 'quit.answer', answer: 'non', now: 1 }]).effects).toEqual([]);
  });
});

describe('échec d’enregistrement et plafond de durée', () => {
  const atSynthese = (): FlowState => ({ ...initialFlow(), screen: 'synthese', startedAt: 0, endedAt: 600_000 });

  it('la durée réelle est plafonnée à 4 h (activité oubliée jusqu’au matin)', () => {
    const s = { ...atSynthese(), endedAt: 20 * 3600_000 };
    const p = buildMomentPayload(s, { activity, debrief: [], baseDuration: 10, place: 'maison', skipped: false, now: 1 });
    expect(MAX_REAL_DURATION_S).toBe(14_400);
    expect(p.duration_real_s).toBe(14_400);
    const normal = buildMomentPayload(atSynthese(), { activity, debrief: [], baseDuration: 10, place: 'maison', skipped: false, now: 1 });
    expect(normal.duration_real_s).toBe(600);
  });

  it('un échec ouvre deux choix ; fermer ne relance pas l’écriture', () => {
    const saving = flowReduce(atSynthese(), { t: 'synthese.save', skipped: true }, ctx());
    const failed = flowReduce(saving.state, { t: 'record.failed' }, ctx());
    expect(failed.state.saveFailed).toBe(true);
    expect(failed.state.recording).toBe(false);
    const closed = flowReduce(failed.state, { t: 'quit.request' }, ctx());
    expect(closed.effects).toEqual([]);
    expect(closed.state.saveFailed).toBe(true);
  });

  it('« Réessayer » relance une seule écriture, avec le même choix (Passer ou Garder)', () => {
    const saving = flowReduce(atSynthese(), { t: 'synthese.save', skipped: true }, ctx());
    const failed = flowReduce(saving.state, { t: 'record.failed' }, ctx()).state;
    const retry = flowReduce(failed, { t: 'record.retry' }, ctx());
    expect(retry.effects).toEqual([{ type: 'record', skipped: true }]);
    expect(retry.state.saveFailed).toBe(false);
    expect(flowReduce(retry.state, { t: 'record.retry' }, ctx()).effects).toEqual([]);
  });

  it('« Quitter sans enregistrer » sort sans aucun enregistrement', () => {
    const saving = flowReduce(atSynthese(), { t: 'synthese.save', skipped: false }, ctx());
    const failed = flowReduce(saving.state, { t: 'record.failed' }, ctx()).state;
    const left = flowReduce(failed, { t: 'record.leave' }, ctx());
    expect(left.effects).toEqual([{ type: 'exit', to: 'home' }]);
    expect(left.effects.some((e) => e.type === 'record' || e.type === 'seal-letter')).toBe(false);
    // Hors échec, ces deux évènements ne font rien.
    expect(flowReduce(atSynthese(), { t: 'record.leave' }, ctx()).effects).toEqual([]);
    expect(flowReduce(atSynthese(), { t: 'record.retry' }, ctx()).effects).toEqual([]);
  });

  it('un échec à la sortie anticipée (synthèse) donne les mêmes deux choix', () => {
    const q = flowReduce(atSynthese(), { t: 'quit.request' }, ctx());
    expect(q.effects).toEqual([{ type: 'record', skipped: true }]);
    expect(flowReduce(q.state, { t: 'record.failed' }, ctx()).state.saveFailed).toBe(true);
  });
});

describe('enregistrement et fin', () => {
  const answered = play([
    { t: 'checkin.answer', axis: 'emotion', option: 'joie' },
    { t: 'checkin.leave' }, { t: 'rappel.next' }, { t: 'activity.start', now: 0 },
    { t: 'activity.finish', now: 600_000 },
    { t: 'debrief.answer', index: 0, text: ' sa réponse ' },
    ...Array.from({ length: activity.debrief.length }, () => ({ t: 'debrief.next' }) as FlowEvent), { t: 'cloture.done' }, { t: 'minutes.elapsed' },
    { t: 'synthese.rating', rating: 5 }, { t: 'synthese.outcome', outcome: 'ACCROCHE' }, { t: 'synthese.kept', text: ' belle phrase ' },
  ]).state;

  it('« Garder ce moment » envoie tout, avec le temps réellement joué', () => {
    const payload = buildMomentPayload(answered, { activity, debrief: activity.debrief, baseDuration: 10, place: 'voiture', skipped: false, now: 1 });
    expect(payload).toMatchObject({
      activityId: activity.id, duration_chosen: 10, duration_real_s: 600, place: 'voiture',
      checkin: { emotion: 'joie' }, kept_phrase: 'belle phrase', rating: 5, outcome: 'ACCROCHE',
    });
    expect(payload.debrief).toEqual([{ kind: activity.debrief[0].kind, answer: 'sa réponse' }]);
  });

  it('la durée annoncée suit les 10 minutes ajoutées (plafond 30)', () => {
    const withExt = { ...answered, ext: { open: [0], extraMinutes: 10, boost: 1 } };
    expect(buildMomentPayload(withExt, { activity, debrief: [], baseDuration: 10, place: 'maison', skipped: false, now: 1 }).duration_chosen).toBe(20);
  });

  it('les forces notées deviennent une liste, un autre texte une phrase', () => {
    expect(buildCapture({ kind: 'forces', label: 'x' }, false, ['a', ' ', 'b'], '')).toEqual({ kind: 'forces', items: ['a', 'b'] });
    expect(buildCapture({ kind: 'forces', label: 'x' }, false, ['', '', ''], '')).toBeNull();
    expect(buildCapture({ kind: 'mot', label: 'x' }, false, [], ' un mot ')).toEqual({ kind: 'mot', text: 'un mot' });
    expect(buildCapture(null, false, ['a'], 'b')).toBeNull();
  });

  it('l’écriture réussie ouvre la fin ; un échec laisse le parent sur la synthèse', () => {
    const rec = flowReduce(answered, { t: 'synthese.save', skipped: false }, ctx());
    expect(flowReduce(rec.state, { t: 'record.done' }, ctx()).state.screen).toBe('fin');
    const failed = flowReduce(rec.state, { t: 'record.failed' }, ctx()).state;
    expect(failed.screen).toBe('synthese');
    expect(flowReduce(failed, { t: 'record.retry' }, ctx()).effects).toHaveLength(1);
  });

  it('compteur, étoiles, objet débloqué : calculés depuis les moments, jamais figés', () => {
    const week1 = P3_ACTIVITIES.filter((a) => a.week === 1 && a.programme === 'coeur');
    expect(week1.length).toBe(3);
    const now = new Date('2026-10-13T12:00:00');
    const mk = (a: P3Activity, d: number): Moment => ({ activity_id: a.id, created_at: new Date(now.getTime() - d * 3600_000).toISOString(), duration_chosen: 10, rating: null });
    const before = [mk(week1[0], 3), mk(week1[1], 2)];
    const after = mk(week1[2], 0);
    const s = summarizeAfter({ before, after, activity: week1[2], now, skipped: false, rating: 5, outcome: null, kept: '' });
    expect(s.countBefore).toBe(2);
    expect(s.count).toBe(3);
    expect(s.weekStars).toBe(3);
    expect(s.weekJustDone).toBe(true);
    expect(s.newRewards).toEqual(['fiche_identite']);
    expect(s.answered).toBe(true);
    expect(s.prideKey).toBe('done');
    // Un moment sauté n'est pas « répondu » : le compteur s'affiche directement.
    expect(summarizeAfter({ before, after, activity: week1[2], now, skipped: true, rating: 5, outcome: null, kept: '' }).answered).toBe(false);
    // Une note basse ne fait jamais un échec : juste « Normal. »
    expect(summarizeAfter({ before, after, activity: week1[2], now, skipped: false, rating: 2, outcome: null, kept: '' })).toMatchObject({ low: true, prideKey: 'notReally' });
    // Déjà gagné : pas de second déblocage.
    expect(summarizeAfter({ before: [...before, after], after: mk(week1[0], 0), activity: week1[0], now, skipped: false, rating: null, outcome: null, kept: '' }).newRewards).toEqual([]);
    expect(counterSteps(10, 13)).toEqual([10, 11, 12, 13]);
    expect(counterSteps(13, 13)).toEqual([13]);
    expect(countLine(1, 'Léa')).toBe('1 moment avec Léa');
    expect(countLine(12, 'Léa')).toBe('12 moments avec Léa');
  });
});

describe('minuteurs', () => {
  const timer = { rounds: 2, phases: [{ tone: 'tension' as const, label: 'Tout raide', seconds: 5 }, { tone: 'detente' as const, label: 'Tout mou', seconds: 5 }] };

  it('minuteur de jeu : « Prêt ? 3, 2, 1 », enchaîne phases et tours, puis termine', () => {
    expect(stepTimerAt(timer, 0)).toMatchObject({ lead: true, leadLeft: 3, globalPhase: -1 });
    expect(stepTimerAt(timer, 2.1)).toMatchObject({ lead: true, leadLeft: 1 });
    expect(stepTimerAt(timer, 3)).toMatchObject({ lead: false, round: 0, phaseIndex: 0, left: 5, globalPhase: 0 });
    expect(stepTimerAt(timer, 8.5)).toMatchObject({ round: 0, phaseIndex: 1, left: 5, globalPhase: 1 });
    expect(stepTimerAt(timer, 3 + 10)).toMatchObject({ round: 1, phaseIndex: 0, globalPhase: 2 });
    expect(stepTimerAt(timer, 3 + 20)).toMatchObject({ finished: true, globalPhase: 999 });
    expect(timerSummary(timer)).toBe('2 × (5 s + 5 s)');
  });

  it('typographie : espaces insécables et gras', () => {
    expect(frTypo('« Salut ? »')).toBe('« Salut ? »');
    expect(splitBold('un **mot** clé')).toEqual([{ text: 'un ', bold: false }, { text: 'mot', bold: true }, { text: ' clé', bold: false }]);
  });

  it('« 1 minute » au singulier', () => {
    expect(closingLine(1, 'Léa')).toBe('1 minute avec Léa.');
    expect(minutesPlayed(10)).toBe(1);
  });
});

describe('aucune donnée de démo', () => {
  it('le module ne contient ni prénom ni code d’activité en dur', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, 'flow.ts'), 'utf8');
    for (const demo of ['Léo', 'Camille', 'Alex', 'ACT-0802', 'cabane']) expect(src).not.toContain(demo);
  });
});
