import { describe, expect, it } from 'vitest';
import { authErrorMessage, childSaveErrorMessage, decideRoute, type RouteInput } from './onboarding';

const base: RouteInput = { isLoading: false, isAuthenticated: true, role: 'PARENT', group: '(parent)', screen: 'maison', childrenLoaded: true, childCount: 1 };
const d = (p: Partial<RouteInput>) => decideRoute({ ...base, ...p });

describe('decideRoute', () => {
  it('attend pendant le chargement de la session', () => {
    expect(d({ isLoading: true })).toEqual({ kind: 'wait' });
  });
  it('non connecté : Bienvenue, sauf déjà sur auth/welcome', () => {
    expect(d({ isAuthenticated: false, group: '(parent)' })).toEqual({ kind: 'redirect', to: '/welcome' });
    expect(d({ isAuthenticated: false, group: '(auth)' })).toEqual({ kind: 'stay' });
    expect(d({ isAuthenticated: false, group: 'welcome' })).toEqual({ kind: 'stay' });
  });
  it('parent, enfants inconnus : loader, jamais Maison', () => {
    expect(d({ childrenLoaded: false, childCount: 0, group: '(auth)' })).toEqual({ kind: 'wait' });
    expect(d({ childrenLoaded: false, childCount: 0 })).toEqual({ kind: 'wait' });
  });
  it('parent sans enfant : création forcée, depuis auth ou Maison', () => {
    expect(d({ childCount: 0, group: '(auth)' })).toEqual({ kind: 'redirect', to: '/(parent)/children' });
    expect(d({ childCount: 0, screen: 'maison' })).toEqual({ kind: 'redirect', to: '/(parent)/children' });
    expect(d({ childCount: 0, screen: 'children' })).toEqual({ kind: 'stay' });
  });
  it('parent avec enfant : Maison depuis auth/welcome, sinon reste', () => {
    expect(d({ group: '(auth)' })).toEqual({ kind: 'redirect', to: '/(parent)/maison' });
    expect(d({ group: 'welcome' })).toEqual({ kind: 'redirect', to: '/(parent)/maison' });
    expect(d({ group: undefined })).toEqual({ kind: 'redirect', to: '/(parent)/maison' });
    expect(d({ screen: 'children' })).toEqual({ kind: 'stay' });
  });
  it('coach : jamais bloqué par les enfants', () => {
    expect(d({ role: 'COACH', group: '(auth)', childrenLoaded: false, childCount: 0 })).toEqual({ kind: 'redirect', to: '/(coach)/dashboard' });
    expect(d({ role: 'COACH', group: '(parent)' })).toEqual({ kind: 'redirect', to: '/(coach)/dashboard' });
    expect(d({ role: 'COACH', group: '(coach)' })).toEqual({ kind: 'stay' });
  });
});

describe('messages', () => {
  it('inscription', () => {
    expect(authErrorMessage({ message: 'User already registered' })).toMatch(/existe déjà/);
    expect(authErrorMessage({ message: 'Network request failed' })).toMatch(/réseau/);
    expect(authErrorMessage({ message: 'xyz' })).toBe('Inscription impossible. Réessaie.');
    expect(authErrorMessage({ message: 'Ton compte est créé.' })).toBe('Ton compte est créé.');
  });
  it('enfant', () => {
    expect(childSaveErrorMessage({ code: '42501', message: 'new row violates row-level security' })).toMatch(/autorisation/);
    expect(childSaveErrorMessage(new Error('Network request failed'))).toMatch(/réseau/);
    expect(childSaveErrorMessage(new Error('boom'))).toMatch(/Réessayer|réessayer/);
  });
});
