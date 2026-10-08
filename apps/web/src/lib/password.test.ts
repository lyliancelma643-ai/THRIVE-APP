import { describe, expect, it } from 'vitest';
import { passwordError, PASSWORD_MIN_LENGTH } from '@thrive/shared';

// Miroir de supabase/config.toml : 12 caractères, minuscule, majuscule, chiffre.
describe('règle de mot de passe', () => {
  it('suit la longueur minimale de la config Auth', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });
  it('refuse trop court, sans majuscule ou sans chiffre', () => {
    expect(passwordError('Court1')).toMatch(/12 caractères/);
    expect(passwordError('toutenminuscule1')).toMatch(/majuscule/);
    expect(passwordError('SansChiffreIci')).toMatch(/chiffre/);
  });
  it('accepte un mot de passe conforme', () => {
    expect(passwordError('Soleil2026Maison')).toBeNull();
  });
});
