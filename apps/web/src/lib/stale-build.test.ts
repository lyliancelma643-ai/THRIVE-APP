import { describe, expect, it } from 'vitest';
import { isStaleBuildError } from './stale-build';

describe('isStaleBuildError', () => {
  it.each([
    { name: 'ChunkLoadError', message: 'Loading chunk 8123 failed.' },
    { name: 'Error', message: 'Loading chunk app/parent/page failed.' },
    { name: 'TypeError', message: 'Failed to fetch dynamically imported module: https://x/_next/a.js' },
    { name: 'TypeError', message: 'Importing a module script failed.' },
  ])('$message → nouvelle version', (e) => expect(isStaleBuildError(e)).toBe(true));

  it.each([
    { name: 'TypeError', message: "Cannot read properties of undefined (reading 'id')" },
    { name: 'Error', message: 'Failed to fetch' },
  ])('$message → autre erreur', (e) => expect(isStaleBuildError(e)).toBe(false));

  it('null', () => expect(isStaleBuildError(null)).toBe(false));
});
