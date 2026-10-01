import { describe, expect, it } from 'vitest';
import { exportFileName } from './account';

describe('exportFileName', () => {
  it('date locale sur deux chiffres', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('thrive-mes-donnees-2026-01-05.json');
    expect(exportFileName(new Date(2026, 11, 31))).toBe('thrive-mes-donnees-2026-12-31.json');
  });
});
