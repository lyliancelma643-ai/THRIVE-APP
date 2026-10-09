import { describe, expect, it } from 'vitest';
import { parseAccessState, sectionView, type AccessState } from './access';

// Réponses access_state() telles que renvoyées par la migration 080.
const base = {
  role: 'PARENT', unlocked: true, has_child: true, has_confirmed_child: true, coach_validated: true,
  fitness_enabled: true, bilan_level: 'ESSENTIEL', is_staff: false,
  forced: { maison: null, bilan: null, seances: null },
};
const state = (extra: Record<string, unknown>) => parseAccessState({ ...base, ...extra }) as AccessState;

describe('parseAccessState', () => {
  it('lit le nouvel objet unique', () => {
    const s = parseAccessState({
      ...base, p3_subscribed: false, p3_access: false, program_pack: 'COMPLET',
      sections: { maison: false, bilan: true, seances: true }, bilan_level: 'AVANCE',
      forced: { maison: null, bilan: true, seances: null },
    });
    expect(s?.p3Access).toBe(false);
    expect(s?.bilanAccess).toBe(true);
    expect(s?.bilanLevel).toBe('AVANCE');
    expect(s?.forced.bilan).toBe(true);
    expect(s?.forced.maison).toBeNull();
    expect(s?.programPack).toBe('COMPLET');
  });

  it('lit les champs 080 : modes, sources, dates, essai', () => {
    const s = state({
      sections: { maison: true, bilan: true, seances: true },
      bilan_mode: 'complet', seances_mode: 'complet',
      source_maison: 'pack', source_bilan: 'pack', source_seances: 'pack',
      pack_actif: 'individuel', program_pack: 'INDIVIDUEL',
      pack_debut: '2026-10-01', pack_fin: '2027-01-15', fin_acces_maison: '2027-01-15', trial_used: true,
    });
    expect(s.sources.maison).toBe('pack');
    expect(s.modes.bilan).toBe('complet');
    expect(s.packEnd).toBe('2027-01-15');
    expect(s.maisonEndsOn).toBe('2027-01-15');
    expect(s.trialUsed).toBe(true);
  });

  it('une clé absente ne donne JAMAIS accès (pas de repli sur « unlocked »)', () => {
    // Avant 080, un compte activé par le coach ouvrait Bilan par défaut côté client.
    const s = parseAccessState({ role: 'PARENT', unlocked: true });
    expect(s?.p3Access).toBe(false);
    expect(s?.bilanAccess).toBe(false);
    expect(s?.seancesAccess).toBe(false);
    expect(s?.modes.bilan).toBe('verrouille');
  });

  it('reste compatible avec l’ancienne forme (sans sections)', () => {
    const s = parseAccessState({ role: 'PARENT', unlocked: false, p3_access: true });
    expect(s?.p3Access).toBe(true);
    expect(s?.bilanAccess).toBe(false);
    expect(s?.bilanLevel).toBe('ESSENTIEL');
  });

  it('une réponse vide ou anonyme n’ouvre rien (état nul)', () => {
    expect(parseAccessState(null)).toBeNull();
    expect(parseAccessState({ unlocked: false, reason: 'anonymous' })).toBeNull();
  });
});

describe('sectionView — matrice d’accès', () => {
  it('pack actif : Bilan et Mes séances ouverts', () => {
    const s = state({ sections: { maison: true, bilan: true, seances: true }, bilan_mode: 'complet', seances_mode: 'complet' });
    expect(sectionView(s, 'bilan')).toBe('open');
    expect(sectionView(s, 'seances')).toBe('open');
  });

  it('abonnement Maison seul : Bilan et Mes séances verrouillés (floutés)', () => {
    const s = state({
      unlocked: false, sections: { maison: true, bilan: false, seances: false },
      bilan_mode: 'verrouille', seances_mode: 'verrouille', source_maison: 'abonnement',
    });
    expect(s.p3Access).toBe(true);
    expect(sectionView(s, 'bilan')).toBe('locked');
    expect(sectionView(s, 'seances')).toBe('locked');
  });

  it('aucun droit : tout verrouillé', () => {
    const s = state({ unlocked: false, sections: { maison: false, bilan: false, seances: false } });
    expect(s.p3Access).toBe(false);
    expect(sectionView(s, 'bilan')).toBe('locked');
  });

  it('pack terminé : lecture seule de l’historique', () => {
    const s = state({ sections: { maison: false, bilan: true, seances: true }, bilan_mode: 'lecture', seances_mode: 'lecture' });
    expect(sectionView(s, 'bilan')).toBe('readonly');
  });

  it('pack actif mais parcours pas encore démarré : étapes d’activation', () => {
    const s = state({ unlocked: false, sections: { maison: true, bilan: true, seances: true }, bilan_mode: 'complet', seances_mode: 'complet' });
    expect(sectionView(s, 'bilan')).toBe('preparing');
  });
});
