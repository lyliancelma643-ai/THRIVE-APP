import { describe, it, expect } from 'vitest';
import {
  CARD_ORDER, LOCK_NOTES, PACK_TO_PLAN, buildExtras, buildParcours, cardForFocus, certificateState, emptyExtras, isGroupPreview, letterState, programPct, rightsFor,
} from './bilanPage';
import { PACK_ORDER, PLAN_FEATURES, type Pack } from '../../lib/packs';
import type { ProgramPack } from '../../services/programPayments';
import { CARD_INFO } from './cardInfo';

describe('page Bilan : ordre des cartes (celui de la page web)', () => {
  it('programme, passeport, compétences, bien-être, parcours, boîte, étapes, puis les 8 ateliers', () => {
    expect(CARD_ORDER).toEqual([
      'rappels', 'programme', 'passeport', 'competences', 'bienetre', 'parcours', 'boite', 'etapes',
      'outils', 'identite', 'objectif', 'focus', 'emotions', 'routine', 'contrat', 'lettre', 'certificat',
    ]);
  });
  it('chaque carte du web a sa fiche « Comprendre cette carte »', () => {
    for (const k of ['programme', 'perma', 'parcours', 'competences', 'boite', 'etapes', 'identite', 'objectif', 'focus', 'emotions', 'routine', 'contrat', 'lettre', 'certificat']) {
      expect(CARD_INFO[k]?.sections.length).toBeGreaterThan(0);
    }
  });
  it('?focus= vise une carte', () => {
    expect(cardForFocus('perma')).toBe('bienetre');
    expect(cardForFocus('lettre')).toBe('lettre');
    expect(cardForFocus('inconnu')).toBeNull();
  });
});

describe('droits d’analyse : non-dérive avec la matrice partagée (lib/packs.ts)', () => {
  it('chaque forfait vendu correspond à un code de la matrice, et chaque code de la matrice a un forfait', () => {
    expect(Object.values(PACK_TO_PLAN).sort()).toEqual([...PACK_ORDER].sort());
  });
  it.each(Object.entries(PACK_TO_PLAN) as [ProgramPack, Pack][])('%s : rightsFor = PLAN_FEATURES[%s]', (pack, plan) => {
    expect(rightsFor(pack)).toEqual({
      skillBreakdown: PLAN_FEATURES[plan].skillBreakdown,
      wellbeingCurve: PLAN_FEATURES[plan].lsssCurve,
      emotionWheel: PLAN_FEATURES[plan].emotionWheel,
    });
  });
  it('la matrice partagée reste monotone : Groupe < Individuel = Complet pour ces trois droits', () => {
    for (const f of ['skillBreakdown', 'lsssCurve', 'emotionWheel'] as const) {
      expect(PLAN_FEATURES.ESSENTIEL[f]).toBe(false);
      expect(PLAN_FEATURES.AVANCE[f]).toBe(true);
      expect(PLAN_FEATURES.PERFORMANCE[f]).toBe(true);
    }
  });
});

describe('forfait Groupe (G11)', () => {
  it('Groupe : compétences détaillées, courbe et roue en aperçu', () => {
    const r = rightsFor('groupe');
    expect(r).toEqual({ skillBreakdown: false, wellbeingCurve: false, emotionWheel: false });
    expect(isGroupPreview(r)).toBe(true);
  });
  it('Individuel, Complet et accès sans pack : tout ouvert', () => {
    for (const p of ['individuel', 'complet', null] as const) expect(isGroupPreview(rightsFor(p))).toBe(false);
  });
  it('pack attendu mais forfait pas encore lu : fermé (jamais d’ouverture par défaut)', () => {
    expect(isGroupPreview(rightsFor(null, true))).toBe(true);
  });
  it('les notes de verrou n’ont ni lien ni prix', () => {
    for (const t of Object.values(LOCK_NOTES)) {
      expect(t).toContain('dès le pack Individuel');
      expect(t).not.toMatch(/https?:|\$|forfaits|acheter|payer/i);
    }
  });
});

describe('lettre (G9) et certificat (G10) : verrou S13', () => {
  it('lettre à venir tant qu’elle n’est pas écrite, puis scellée ; son texte n’est jamais dans les extras', () => {
    expect(letterState(null, false)).toBe('upcoming');
    expect(letterState('  ', false)).toBe('upcoming');
    expect(letterState('Chère moi…', false)).toBe('sealed');
    expect(letterState(null, true)).toBe('sealed');
    const x = buildExtras({
      raw: { sessions: [], identity: { sport_story: null, my_actions: [], letter: 'TEXTE SECRET', program_pct_override: null, certificate_ready: false }, latestEmotion: null, docs: [], pendingWellbeing: null },
      completed: 13, card: null, steps: [], docs: [], gauge: null, lsss: [], perma: [], rights: rightsFor(null),
    });
    expect(x.letter).toBe('sealed');
    expect(JSON.stringify(x)).not.toContain('TEXTE SECRET');
  });
  it('certificat verrouillé sans feu vert ET document', () => {
    expect(certificateState(false, true)).toBe('locked');
    expect(certificateState(true, false)).toBe('locked');
    expect(certificateState(true, true)).toBe('available');
    expect(emptyExtras().certificate).toBe('locked');
  });
});

describe('parcours et pourcentage', () => {
  it('13 pastilles pilotées par le statut ; manquée/reportée = ton neutre, aucun état d’échec', () => {
    const sessions = [
      ...[1, 2, 3].map((n) => ({ session_number: n, status: 'COMPLETED', scheduled_at: null })),
      { session_number: 4, status: 'MISSED', scheduled_at: null },
      { session_number: 5, status: 'IN_PROGRESS', scheduled_at: null },
      { session_number: 6, status: 'POSTPONED', scheduled_at: null },
    ];
    const p = buildParcours(sessions, 3);
    expect(p.nodes).toHaveLength(13);
    expect(p.doneCount).toBe(3);
    expect(p.last).toBe(3);
    expect(p.nodes[3]).toMatchObject({ state: 'replan', sub: 'S4 · à replanifier' });
    expect(p.nodes[4].state).toBe('current');
    expect(p.nodes[5].sub).toBe('S6 · reportée');
    expect(p.nodes[6].sub).toBe('LSSS');
    expect(p.nodes[12].sub).toBe('Bilan');
    expect(JSON.stringify(p)).not.toMatch(/manquée|échec/i);
  });
  it('sans statut, retombe sur le nombre de séances validées', () => {
    const p = buildParcours([], 4);
    expect(p.nodes.filter((n) => n.state === 'done')).toHaveLength(4);
    expect(p.nodes[4].state).toBe('current');
  });
  it('programme : séances sur 13, sauf valeur fixée par le coach', () => {
    expect(programPct(7)).toBe(54);
    expect(programPct(13)).toBe(100);
    expect(programPct(7, 13, 80)).toBe(80);
    expect(programPct(7, 13, 150)).toBe(100);
  });
});
