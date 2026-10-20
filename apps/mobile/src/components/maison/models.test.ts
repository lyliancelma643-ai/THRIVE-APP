import { describe, expect, it } from 'vitest';
import { isVisible, p3Pool } from '../../lib/p3';
import { recommendTonight } from './logic';
import { MOMENT_CHIPS, PHASE_CHIPS, bannerFor, buildCarnetVM, buildHomeVM, buildParcoursVM, captureTitle, filterForParcours, momentShelfItems } from './models';
import { buildParcours } from './logic';
import { getActivity } from '../../lib/p3';

const pool = p3Pool();
const now = new Date('2026-10-12T20:00:00Z');

function home(done: string[], chip = 'rien') {
  const doneIds = new Set(done);
  const tonight = recommendTonight(pool, doneIds, '8-11')!;
  return buildHomeVM({
    childName: 'Test', tonight, duration: 20, pool, doneIds, momentsTotal: done.length, weekDone: 0, weekTarget: 3,
    momentChip: chip, phaseChip: 'DEVELOPPER', banner: null, invite: false, carnet: [],
  });
}

describe('accès → bandeau de l’affiche', () => {
  it('forfait accompagné : « Inclus avec ton programme », sans prix ni lien', () => {
    expect(bannerFor({ sourceMaison: 'pack', isTrial: false, expirationDate: null, now })).toEqual({ kind: 'included', label: 'Inclus avec ton programme' });
  });
  it('essai gratuit : jours restants', () => {
    expect(bannerFor({ sourceMaison: 'abonnement', isTrial: true, expirationDate: '2026-11-05T20:00:00Z', now })?.label).toBe('Essai gratuit · encore 24 jours');
    expect(bannerFor({ sourceMaison: 'abonnement', isTrial: true, expirationDate: '2026-10-13T08:00:00Z', now })?.label).toBe('Essai gratuit · encore 1 jour');
  });
  it('sinon rien (aucun texte conditionnel inventé)', () => {
    expect(bannerFor({ sourceMaison: 'aucune', isTrial: false, expirationDate: null, now })).toBeNull();
  });
});

describe('modèle de l’accueil', () => {
  it('même sélection que recommendTonight, semaine 1 au départ', () => {
    const vm = home([]);
    expect(vm.hero.id).toBe('ACT-0101');
    expect(vm.weekPosters.map((p) => p.id)).toEqual(['ACT-0101', 'ACT-0102', 'ACT-0103']);
  });
  it('ouvre la semaine N+1 quand les 3 fiches de la semaine N sont vécues', () => {
    const vm = home(['ACT-0101', 'ACT-0102', 'ACT-0103']);
    expect(vm.weekPosters.every((p) => p.id.startsWith('ACT-02'))).toBe(true);
  });
  it('ne montre jamais un code pilier (P1…P8) ni une série', () => {
    const vm = JSON.stringify(home(['ACT-0101']));
    expect(vm).not.toMatch(/\bP[1-8]\b/);
    expect(vm).not.toMatch(/d’affilée|série|streak/i);
  });
  it('chaque pastille « Selon ton moment » ne propose que des fiches visibles (les compléments à venir restent cachés)', () => {
    for (const c of MOMENT_CHIPS) {
      const items = momentShelfItems(pool, c.key, new Set(), 1, null);
      for (const a of items) expect(isVisible(a, 1)).toBe(true);
    }
    expect(PHASE_CHIPS.map((p) => p.key)).toEqual(['ANCRER', 'DEVELOPPER', 'INTEGRER']);
  });
});

describe('parcours et carnet', () => {
  it('13 semaines, états neutres, filtre « Quand il dit non » limité à la tranche d’âge', () => {
    const doneIds = new Set(['ACT-0101', 'ACT-0102', 'ACT-0103']);
    const vm = buildParcoursVM({ weeks: buildParcours(pool, doneIds), bonus: [], poolSize: pool.length, doneIds, filter: undefined, filtered: [] });
    expect(vm.weeks).toHaveLength(13);
    expect(vm.weeks[0].state).toBe('faite');
    expect(vm.weeks[1].state).toBe('en_cours');
    expect(vm.weeks[12].posters.every((p) => p.locked)).toBe(true);
    const refus = filterForParcours(pool, 'refus', '8-11', doneIds);
    expect(refus.every((a) => a.anti_refusal && a.age_bands.includes('8-11'))).toBe(true);
  });
  it('carnet : titre court de la capture, objets gagnés / à venir', () => {
    expect(captureTitle(getActivity('ACT-0101'))).toBe('Ses trois forces');
    const vm = buildCarnetVM({
      firstName: 'Test',
      earned: [{ reward: { id: 'fiche_identite', trigger: { kind: 'week_complete', week: 1 } }, label: 'La Fiche Identité de Test' }],
      upcoming: [{ reward: { id: 'certificat' }, label: 'Le Certificat' }],
      kept: [{ activity_id: 'ACT-0101', created_at: '2026-10-08T20:00:00Z', kept_phrase: 'Il rit fort' }],
    });
    expect(vm.earned[0].detail).toBe('Semaine 1 complète. Acquis pour toujours.');
    expect(vm.objects.map((o) => o.got)).toEqual([true, false]);
    expect(vm.kept[0]).toMatchObject({ activityId: 'ACT-0101', phrase: 'Il rit fort' });
  });
});
