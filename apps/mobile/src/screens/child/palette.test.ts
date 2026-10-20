import { describe, expect, it } from 'vitest';
import { epochPalette } from './palette';

describe('epochPalette (W · questionnaire de l’enfant)', () => {
  it('Lin = ambre clair, Veillée = ambre sombre', () => {
    expect(epochPalette('lin').bg).toBe('#FFF4E2');
    expect(epochPalette('veillee').bg).toBe('#2A1A05');
  });
  it('l’ombre chaude de la carte n’existe qu’en Lin', () => {
    expect(epochPalette('lin').cardShadow).toBeGreaterThan(0);
    expect(epochPalette('veillee').cardShadow).toBe(0);
  });
});
