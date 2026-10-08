import { describe, expect, it } from 'vitest';
import { buildAuthCookie, cookieMaxAge } from './auth-cookie';

const jwt = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;

describe('cookie de session', () => {
  it('aligne la durée sur l’expiration du JWT', () => {
    expect(cookieMaxAge(jwt(1_000_000 + 3600), 1_000_000)).toBe(3600);
    expect(cookieMaxAge(jwt(1_000_000 - 5), 1_000_000)).toBe(60);
  });
  it('repli 1 h si le jeton est illisible', () => {
    expect(cookieMaxAge('pas-un-jwt')).toBe(3600);
  });
  it('pose Secure en https, SameSite=Lax et Path=/', () => {
    const c = buildAuthCookie(jwt(Math.floor(Date.now() / 1000) + 3600), true);
    expect(c).toMatch(/; Secure/);
    expect(c).toMatch(/SameSite=Lax/);
    expect(c).toMatch(/path=\//);
    expect(buildAuthCookie(jwt(Math.floor(Date.now() / 1000) + 3600), false)).not.toMatch(/Secure/);
  });
  it('efface le cookie avec les mêmes attributs', () => {
    expect(buildAuthCookie(null, true)).toMatch(/max-age=0/);
  });
});
