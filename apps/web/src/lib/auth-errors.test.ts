import { describe, expect, it } from 'vitest';
import { AUTH_GENERIC_ERROR, humanAuthError } from './auth-errors';

describe('humanAuthError', () => {
  it.each([
    ['Invalid login credentials', 'Email ou mot de passe incorrect.'],
    ['TypeError: Failed to fetch', 'Connexion lente ou interrompue. Vérifie ton réseau et réessaie.'],
    ['User already registered', 'Un compte existe déjà avec cet email.'],
    ['Unable to validate email address: invalid format', "L'adresse email n'est pas valide."],
    ['New password should be different from the old password.', "Choisis un mot de passe différent de l'ancien."],
    [
      'For security purposes, you can only request this after 42 seconds.',
      'Par sécurité, patiente une minute avant de redemander un lien.',
    ],
    ['Email rate limit exceeded', 'Trop de tentatives. Réessaie dans quelques minutes.'],
    [
      'Password should be at least 6 characters.',
      'Mot de passe trop faible : au moins 8 caractères, évite les mots de passe courants.',
    ],
    ['Email link is invalid or has expired', 'Ce lien a expiré ou a déjà servi. Redemande un nouvel email.'],
    ['Auth session missing!', 'Ta session a expiré. Reconnecte-toi puis réessaie.'],
    ['JWT expired', 'Ta session a expiré. Reconnecte-toi puis réessaie.'],
  ])('%s', (raw, expected) => {
    expect(humanAuthError(raw)).toBe(expected);
  });

  it('accepte un objet erreur', () => {
    expect(humanAuthError(new Error('Invalid login credentials'))).toBe('Email ou mot de passe incorrect.');
  });

  it("n'affiche jamais un message technique inconnu", () => {
    expect(humanAuthError('unexpected_failure: pg 42804')).toBe(AUTH_GENERIC_ERROR);
    expect(humanAuthError(undefined)).toBe(AUTH_GENERIC_ERROR);
    expect(humanAuthError('')).toBe(AUTH_GENERIC_ERROR);
  });
});
