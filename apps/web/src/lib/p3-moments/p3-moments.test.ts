import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseWeekMarkdown, type P3Activity } from './parse';
import generated from './activities.generated.json';
import { P3ContentSchema } from '../../../../../packages/shared/src/validation/p3Activity.schema';
import {
  NUDGES,
  P3_ACTIVITIES,
  REWARDS,
  activitiesOfWeek,
  bandForAge,
  canRepeat,
  dailyStreak,
  effectiveDuration,
  getActivity,
  isGuiltFree,
  momentsCount,
  momentsPhrase,
  newlyEarned,
  pickTonight,
  renderNudge,
  renderOpener,
  resolveActivity,
  unlockedWeeks,
  weeklyProgress,
  weeklyStreak,
  type Moment,
} from './index';
import { CHECKIN, DEFAULT_OPENER, PAGE_CONSULTER, PAGE_NON, moodFromCheckin } from './guide';

const contentDir = path.resolve(__dirname, '../../content/p3-moments');
const files = readdirSync(contentDir).filter((f) => /^semaine-\d{2}\.md$/.test(f)).sort();
const parsed = files.map((f) => parseWeekMarkdown(readFileSync(path.join(contentDir, f), 'utf8')));
const acts: P3Activity[] = parsed.flatMap((p) => p.activities);

const at = (iso: string) => new Date(iso);
const m = (id: string, iso: string, rating: Moment['rating'] = null, d: 10 | 20 | 30 = 10): Moment => ({
  activity_id: id,
  created_at: new Date(iso).toISOString(),
  duration_chosen: d,
  rating,
});

describe('contenu — 13 semaines × 3 fiches', () => {
  it('13 fichiers, 39 fiches, ids uniques ACT-SSRR', () => {
    expect(files).toHaveLength(13);
    expect(acts).toHaveLength(39);
    expect(new Set(acts.map((a) => a.id)).size).toBe(39);
    for (let w = 1; w <= 13; w++) {
      expect(acts.filter((a) => a.week === w).map((a) => a.rank)).toEqual([1, 2, 3]);
    }
  });

  it('le JSON généré est à jour (sinon : tsx scripts/generate-p3-activities.ts)', () => {
    expect((generated as unknown as { activities: P3Activity[] }).activities).toEqual(acts);
  });

  it('passe le schéma Zod partagé', () => {
    expect(() => P3ContentSchema.parse(generated)).not.toThrow();
  });

  it('rôles : Découvrir · Pratiquer · Transférer (Ancrer en semaine 1)', () => {
    for (const a of acts) {
      const expected = a.rank === 1 ? 'decouvrir' : a.rank === 2 ? 'pratiquer' : a.week === 1 ? 'ancrer' : 'transferer';
      expect(a.role, a.id).toBe(expected);
    }
  });

  it('semaine 1 : aucun débrief de transfert (Méthode, S1) ; ensuite : toujours', () => {
    for (const a of acts) {
      const hasTransfer = a.debrief.some((d) => d.kind === 'ailleurs');
      expect(hasTransfer, a.id).toBe(a.week !== 1);
    }
  });

  it('chaque fiche jouable en 10 minutes (la promesse du produit)', () => {
    for (const a of acts) expect(a.base_duration, a.id).toBe(10);
  });

  it('les fiches de rang 3 passent en voiture : verbal, zéro matériel', () => {
    for (const a of acts.filter((x) => x.rank === 3)) {
      expect(a.car_ok, a.id).toBe(true);
      expect(a.materials, a.id).toEqual([]);
    }
  });

  it('quotas : ≥ 15 % anti-refus, ≥ 15 énergie basse, 0 matériel hors liste blanche', () => {
    expect(acts.filter((a) => a.anti_refusal).length).toBeGreaterThanOrEqual(6);
    expect(acts.filter((a) => a.parent_energy === 'basse').length).toBeGreaterThanOrEqual(15);
    expect(acts.filter((a) => a.specific_materials).map((a) => a.id)).toEqual([]);
  });

  it('aucune fiche ne note, ne chronomètre en comparaison ni ne score l’enfant', () => {
    const forbidden = /\b(score|meilleur que|classement|noter l'enfant|compétition)\b/i;
    for (const a of acts) {
      const text = [...a.steps, ...a.screen_steps].join(' ');
      expect(forbidden.test(text), a.id).toBe(false);
    }
  });

  it('chaque semaine couvre au moins un pilier déclaré pour sa séance', () => {
    for (const p of parsed) {
      const covered = new Set(p.activities.flatMap((a) => [a.pillar_main, ...a.pillars_secondary]));
      expect(p.week.pillars.some((x) => covered.has(x)), `semaine ${p.week.week}`).toBe(true);
    }
  });

  it('chaque fiche a au moins une source de niveau A', () => {
    for (const a of acts) expect(a.sources.some((s) => s.level === 'A'), a.id).toBe(true);
  });
});

describe('âge et durée', () => {
  it('V1 = 8–17 ans : moins de 8 ans hors périmètre', () => {
    expect(bandForAge(7)).toBeNull();
    expect(bandForAge(8)).toBe('8-11');
    expect(bandForAge(12)).toBe('12-14');
    expect(bandForAge(17)).toBe('15-17');
  });

  it('amorce dynamique : le chiffre dit est celui du minuteur', () => {
    const a = getActivity('ACT-0102')!;
    expect(renderOpener(a, 20, '8-11')).toBe('« Pendant vingt minutes, je suis à toi, et c\'est toi qui décides ce qu\'on fait. »');
    expect(renderOpener(a, 10, '15-17')).toBe('« J\'ai dix minutes, tu choisis ce qu\'on fait. »');
    expect(DEFAULT_OPENER).toContain('{duree}');
  });

  it('les extensions se déplient selon la durée ; une fiche 10·20 plafonne à 20', () => {
    const a = getActivity('ACT-0101')!;
    expect(resolveActivity(a, 10, '8-11')!.extensions).toHaveLength(0);
    expect(resolveActivity(a, 30, '8-11')!.extensions).toHaveLength(2);
    expect(effectiveDuration(getActivity('ACT-0103')!, 30)).toBe(20);
  });
});

describe('anti-culpabilité (Architecture §1.1)', () => {
  const now = at('2026-10-15T20:00:00'); // jeudi

  it('règle 1 : une série cassée ne s’affiche pas (null, jamais 0)', () => {
    const moments = [
      m('ACT-0101', '2026-09-28T19:00:00'), m('ACT-0102', '2026-09-29T19:00:00'), m('ACT-0103', '2026-09-30T19:00:00'),
      m('ACT-0201', '2026-10-05T19:00:00'), // semaine du 5 incomplète
    ];
    expect(weeklyStreak(moments, now)).toBeNull();
    expect(dailyStreak(moments, now)).toBeNull();
  });

  it('série hebdomadaire affichée à partir de 2 semaines complètes', () => {
    const moments = [
      m('ACT-0101', '2026-10-05T19:00:00'), m('ACT-0102', '2026-10-06T19:00:00'), m('ACT-0103', '2026-10-07T19:00:00'),
      m('ACT-0201', '2026-10-12T19:00:00'), m('ACT-0202', '2026-10-13T19:00:00'), m('ACT-0203', '2026-10-14T19:00:00'),
    ];
    expect(weeklyStreak(moments, now)).toBe(2);
    expect(weeklyProgress(moments, now)).toEqual({ done: 3, target: 3, complete: true });
  });

  it('règle 2 : aucune notification ne parle de série ou de manque', () => {
    for (const n of NUDGES) expect(isGuiltFree(n), n).toBe(true);
    expect(isGuiltFree('Votre série se termine dans 3 h')).toBe(false);
    expect(isGuiltFree('Vous n’avez rien fait depuis 4 jours')).toBe(false);
    expect(() => renderNudge('Dernière chance pour {prenom}', { prenom: 'Léa' })).toThrow();
    expect(renderNudge(NUDGES[0], { prenom: 'Léa' })).toBe('Léa a dix minutes de libre ce soir ?');
  });

  it('règle 3 : le compteur cumulatif ne fait que monter', () => {
    expect(momentsPhrase(0, 'Léa')).toBeNull();
    expect(momentsPhrase(47, 'Léa')).toBe('47 moments avec Léa');
    const ms = [m('ACT-0101', '2026-10-01T19:00:00'), m('ACT-0102', '2026-10-02T19:00:00', 5, 30)];
    expect(momentsCount(ms)).toBeGreaterThanOrEqual(ms.length);
  });

  it('règle 4 : les récompenses gagnées ne sont jamais recalculées à la baisse', () => {
    const earned = newlyEarned({
      alreadyEarned: new Set(),
      doneIds: new Set(['ACT-0101', 'ACT-0102', 'ACT-0103']),
      momentsTotal: 3,
      subscriptionMonths: 0,
    });
    expect(earned).toEqual(['fiche_identite']);
    const again = newlyEarned({
      alreadyEarned: new Set(['fiche_identite']),
      doneIds: new Set(),
      momentsTotal: 0,
      subscriptionMonths: 0,
    });
    expect(again).toEqual([]); // rien à retirer, rien à regagner
    expect(REWARDS.find((r) => r.id === 'pack_dehors')!.available).toBe(false);
  });
});

describe('programme et carte du soir', () => {
  const now = at('2026-10-15T20:00:00');
  const base = {
    firstName: 'Léa',
    band: '8-11' as const,
    declaredDuration: 10 as const,
    place: 'maison' as const,
    parentEnergy: null,
    childMood: null,
    consecutiveRefusals: 0,
    now,
  };

  it('semaine N+1 ouverte quand les 3 fiches de N sont faites', () => {
    expect(unlockedWeeks(new Set())).toBe(1);
    expect(unlockedWeeks(new Set(['ACT-0101', 'ACT-0102']))).toBe(1);
    expect(unlockedWeeks(new Set(activitiesOfWeek(1).map((a) => a.id)))).toBe(2);
  });

  it('propose d’abord la prochaine fiche du programme', () => {
    expect(pickTonight({ ...base, moments: [] })!.activity.id).toBe('ACT-0101');
    const pick = pickTonight({ ...base, moments: [m('ACT-0101', '2026-10-14T19:00:00')] })!;
    expect(pick.activity.id).toBe('ACT-0102');
    expect(pick.reason).toBe('La suite de votre semaine 1.');
  });

  it('en voiture : uniquement des fiches verbales', () => {
    const pick = pickTonight({ ...base, place: 'voiture', moments: [] })!;
    expect(pick.activity.car_ok).toBe(true);
  });

  it('après 2 refus : une fiche anti-refus', () => {
    const pick = pickTonight({ ...base, moments: [], consecutiveRefusals: 2 })!;
    expect(pick.activity.anti_refusal).toBe(true);
  });

  it('répétition : 5/5 revient après 14 j, 1–2/5 ne revient jamais', () => {
    expect(canRepeat('ACT-0101', [m('ACT-0101', '2026-10-05T19:00:00', 5)], now)).toBe(false);
    expect(canRepeat('ACT-0101', [m('ACT-0101', '2026-09-20T19:00:00', 5)], now)).toBe(true);
    expect(canRepeat('ACT-0101', [m('ACT-0101', '2026-01-01T19:00:00', 2)], now)).toBe(false);
  });
});

describe('textes d’accompagnement', () => {
  it('check-in : l’humeur la plus lourde l’emporte', () => {
    const [emotion, corps] = CHECKIN.axes;
    expect(moodFromCheckin([emotion.options[0], corps.options[0]])).toBe('fatigue');
  });
  it('page « Le non » et page « Quand consulter » présentes', () => {
    expect(PAGE_NON.exitLine).toContain('reproposerai');
    expect(PAGE_CONSULTER.status).toBe('A_VALIDER');
  });
  it('P3_ACTIVITIES exposé à l’app', () => {
    expect(P3_ACTIVITIES).toHaveLength(39);
  });
});
