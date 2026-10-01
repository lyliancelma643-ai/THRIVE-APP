import { describe, expect, it } from 'vitest';
import { ageToDob, childAgeError, validateChildRows } from './child-form';

describe('ageToDob', () => {
  it('soustrait les années en date locale', () => {
    expect(ageToDob(9, new Date(2026, 9, 1, 23, 30))).toBe('2017-10-01');
  });
  it('29 février → 1er mars', () => {
    expect(ageToDob(1, new Date(2028, 1, 29))).toBe('2027-03-01');
  });
});

describe('childAgeError', () => {
  it.each(['8', '12', '17'])('%s ans accepté', (a) => expect(childAgeError(a)).toBeNull());
  it.each(['7', '18', '9.5', 'abc', '-3'])('%s refusé', (a) =>
    expect(childAgeError(a, 'Léo')).toBe("L'âge de Léo doit être compris entre 8 et 17 ans.")
  );
  it('âge manquant', () => expect(childAgeError(' ', 'Maya')).toBe("Indique l'âge de Maya."));
});

describe('validateChildRows', () => {
  const row = (firstName: string, age: string) => ({ firstName, age, sport: '' });

  it('ignore les lignes vides', () => {
    expect(validateChildRows([row('', ''), row('Léo', '9')])).toEqual({
      children: [{ firstName: 'Léo', age: '9', sport: '' }],
      error: null,
    });
  });
  it("ne jette pas en silence un enfant sans âge", () => {
    expect(validateChildRows([row('Léo', '')]).error).toBe("Indique l'âge de Léo.");
  });
  it('âge sans prénom', () => {
    expect(validateChildRows([row('Léo', '9'), row('', '12')]).error).toBe("Indique le prénom de l'enfant 2.");
  });
  it('nettoie le prénom', () => {
    expect(validateChildRows([row('  Maya ', '13')]).children[0].firstName).toBe('Maya');
  });
});
