import { describe, expect, it } from 'vitest';
import { UNCONFIGURED_PATH, hasWorkspace, homeForRole } from './role-home';

describe('homeForRole', () => {
  it('envoie chaque rôle vers son espace', () => {
    expect(homeForRole('PARENT')).toBe('/parent/fitness');
    expect(homeForRole('COACH')).toBe('/coach/dashboard');
    expect(homeForRole('ADMIN')).toBe('/admin');
    expect(homeForRole('SUPER_ADMIN')).toBe('/admin');
  });
  it('rôle inconnu ou enfant : écran « non configuré », jamais un espace (pas de boucle)', () => {
    expect(homeForRole('CHILD')).toBe(UNCONFIGURED_PATH);
    expect(homeForRole('')).toBe(UNCONFIGURED_PATH);
    expect(homeForRole('FUTUR_ROLE')).toBe(UNCONFIGURED_PATH);
  });
  it('hasWorkspace refuse les rôles sans espace', () => {
    expect(hasWorkspace('COACH')).toBe(true);
    expect(hasWorkspace('CHILD')).toBe(false);
    expect(hasWorkspace(undefined)).toBe(false);
  });
});
