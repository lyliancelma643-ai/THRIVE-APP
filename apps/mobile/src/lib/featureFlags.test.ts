import { describe, expect, it } from 'vitest';
import { parseFlag, VIDEO_SESSIONS_ENABLED } from './featureFlags';

describe('featureFlags', () => {
  it('ferme les séances vidéo par défaut', () => {
    expect(VIDEO_SESSIONS_ENABLED).toBe(false);
  });
  it('parseFlag : défaut faux, seuls true/1 ouvrent', () => {
    expect(parseFlag(undefined)).toBe(false);
    expect(parseFlag('')).toBe(false);
    expect(parseFlag('false')).toBe(false);
    expect(parseFlag('TRUE')).toBe(true);
    expect(parseFlag('1')).toBe(true);
    expect(parseFlag(undefined, true)).toBe(true);
  });
});
