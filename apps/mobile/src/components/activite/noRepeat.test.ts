import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P3_ACTIVITIES, resolveActivity, type AgeBand, type Duration } from '../../lib/p3';
import {
  CHECKIN_AXES, flattenGuide, flowReduce, initialFlow, revealedBeatsOfStep, sameText, stepTitleRepeatsRevealedBeat,
  type FlowCtx, type FlowEvent, type FlowScreen,
} from './flow';
import { consumeFlowHold, holdFlowForReturn } from './flowHold';

// Aucune info saisie ou montrée une fois ne doit être redemandée ni réaffichée après « Continuer », pour TOUTES les fiches.

const views = P3_ACTIVITIES.flatMap((a) =>
  (a.age_bands as AgeBand[]).flatMap((band) => {
    const v = resolveActivity(a, a.base_duration as Duration, band);
    return v ? [{ a, band, v }] : [];
  }),
);

describe('aucune répétition dans le contenu d’une fiche', () => {
  it('couvre toutes les fiches', () => {
    expect(views.length).toBeGreaterThan(P3_ACTIVITIES.length - 1);
  });

  it.each(views.map((x) => [`${x.a.id} · ${x.band}`, x] as const))('%s : amorce, temps, débrief et clôture sont tous distincts', (_n, { a, v }) => {
    const seen: Array<[string, string]> = [];
    const add = (label: string, text: string) => seen.push([label, text]);
    add('amorce', v.opener);
    flattenGuide(a.guide).forEach((f, i) => add(`temps ${i + 1} (${f.beat.kind})`, f.beat.text));
    v.debrief.forEach((d, i) => add(`débrief ${i + 1}`, d.question));
    add('clôture', v.closing);
    for (let i = 0; i < seen.length; i += 1) {
      for (let j = i + 1; j < seen.length; j += 1) {
        expect(sameText(seen[i][1], seen[j][1]), `${seen[i][0]} = ${seen[j][0]}`).toBe(false);
      }
    }
    // Le débrief a au moins une question (sinon l'écran serait vide) et un seul « Continuer » le termine.
    expect(v.debrief.length).toBeGreaterThan(0);
  });

  it.each(views.map((x) => [`${x.a.id} · ${x.band}`, x] as const))('%s : un titre d’étape identique à une phrase « Dis » s’efface quand la bulle apparaît', (_n, { a, v }) => {
    const flat = flattenGuide(a.guide);
    a.guide.forEach((_g, step) => {
      const title = v.screen_steps[step];
      const all = revealedBeatsOfStep(flat, step, flat.length);
      const dupe = all.some((f) => f.beat.kind === 'dire' && sameText(f.beat.text, title));
      // Titre seul, avant tout temps révélé : toujours affiché.
      expect(stepTitleRepeatsRevealedBeat(title, [])).toBe(false);
      // Tous les temps révélés : masqué si et seulement s'il double une phrase « Dis ».
      expect(stepTitleRepeatsRevealedBeat(title, all)).toBe(dupe);
    });
  });
});

describe('le check-in ne pose jamais deux fois la même question', () => {
  it('questions et options distinctes', () => {
    const qs = CHECKIN_AXES.map((x) => x.question);
    expect(new Set(qs).size).toBe(qs.length);
    expect(new Set(CHECKIN_AXES.map((x) => x.id)).size).toBe(CHECKIN_AXES.length);
  });
});

describe('parcours complet : chaque écran n’est traversé qu’une fois et rien n’est perdu', () => {
  const a = views[0].a;
  const flat = flattenGuide(a.guide);
  const ctxFor = (inCar: boolean): FlowCtx => ({
    inCar, hasRecall: true, flatLength: flat.length, debriefLength: a.debrief.length, baseDuration: a.base_duration, extensions: a.extensions, isLetter: false,
  });

  function run(inCar: boolean) {
    const c = ctxFor(inCar);
    let s = initialFlow();
    const trail: FlowScreen[] = [s.screen];
    const send = (e: FlowEvent) => {
      s = flowReduce(s, e, c).state;
      if (trail[trail.length - 1] !== s.screen) trail.push(s.screen);
    };
    CHECKIN_AXES.forEach((x) => send({ t: 'checkin.answer', axis: x.id, option: x.options[0].id }));
    const checkin = { ...s.checkin };
    send({ t: 'checkin.leave' });
    send({ t: 'rappel.next' });
    send({ t: 'lecture.read' });
    send({ t: 'activity.start', now: 0 });
    for (let i = 0; i < flat.length; i += 1) send({ t: 'beat.next' });
    send({ t: 'activity.finish', now: 60_000 });
    send({ t: 'debrief.answer', index: 0, text: 'ok' });
    for (let i = 0; i < a.debrief.length + 1; i += 1) send({ t: 'debrief.next' });
    send({ t: 'cloture.done' });
    send({ t: 'minutes.elapsed' });
    return { trail, s, checkin };
  }

  it.each([false, true])('en voiture = %s : aucun écran revisité, réponses conservées', (inCar) => {
    const { trail, s, checkin } = run(inCar);
    expect(new Set(trail).size).toBe(trail.length);
    expect(trail[trail.length - 1]).toBe('synthese');
    expect(s.checkin).toEqual(checkin);
    expect(s.debriefAnswers[0]).toBe('ok');
    expect(trail.includes('lecture')).toBe(inCar);
    expect(trail.includes('amorce')).toBe(true);
  });

  it('une réponse déjà donnée au check-in ne revient pas après « Continuer »', () => {
    const c = ctxFor(false);
    let s = initialFlow();
    s = flowReduce(s, { t: 'checkin.answer', axis: CHECKIN_AXES[0].id, option: CHECKIN_AXES[0].options[0].id }, c).state;
    s = flowReduce(s, { t: 'checkin.leave' }, c).state;
    const again = flowReduce(s, { t: 'checkin.answer', axis: CHECKIN_AXES[1].id, option: CHECKIN_AXES[1].options[0].id }, c).state;
    expect(again.checkin).toEqual(s.checkin);
    expect(s.screen).not.toBe('checkin');
  });
});

describe('écrans : la phrase d’ouverture n’est dite qu’à un seul endroit', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8');
  it('la lecture en voiture n’affiche plus l’amorce, l’écran d’amorce la porte seul', () => {
    expect(read('CarView.tsx')).not.toMatch(/frTypo\(opener\)/);
    expect(read('AmorceView.tsx')).toContain('frTypo(opener)');
  });
});

describe('détour « Voir un objet » depuis l’écran de fin', () => {
  it('conserve le flot UNE seule fois', () => {
    expect(consumeFlowHold()).toBe(false);
    holdFlowForReturn();
    expect(consumeFlowHold()).toBe(true);
    expect(consumeFlowHold()).toBe(false);
  });
  it('la route pose le drapeau avant le détour et le consomme au retour de focus', () => {
    const route = readFileSync(join(__dirname, '../../app/(parent)/moment/[activityId].tsx'), 'utf8');
    expect(route).toContain('holdFlowForReturn();');
    expect(route).toContain('if (!consumeFlowHold()) setEntry');
  });
});
