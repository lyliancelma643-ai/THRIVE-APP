import { describe, expect, it } from 'vitest';
import { parseAccessState } from './access';

describe('parseAccessState', () => {
  it('lit le nouvel objet unique', () => {
    const s = parseAccessState({
      role: 'PARENT', unlocked: true, has_child: true, has_confirmed_child: true, coach_validated: true,
      fitness_enabled: true, p3_subscribed: false, p3_access: false, program_pack: 'COMPLET',
      sections: { maison: false, bilan: true, seances: true }, bilan_level: 'AVANCE', is_staff: false,
      forced: { maison: null, bilan: true, seances: null },
    });
    expect(s?.p3Access).toBe(false);
    expect(s?.bilanAccess).toBe(true);
    expect(s?.bilanLevel).toBe('AVANCE');
    expect(s?.forced.bilan).toBe(true);
    expect(s?.forced.maison).toBeNull();
    expect(s?.programPack).toBe('COMPLET');
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
