import { describe, expect, it } from 'vitest';
import { isDeleteConfirmed } from './delete-account';

describe('confirmation de suppression', () => {
  it('exige le mot SUPPRIMER', () => {
    expect(isDeleteConfirmed('SUPPRIMER')).toBe(true);
    expect(isDeleteConfirmed('  supprimer ')).toBe(true);
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('SUPPRIM')).toBe(false);
  });
});
