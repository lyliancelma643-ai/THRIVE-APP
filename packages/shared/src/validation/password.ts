// Règle de mot de passe — miroir exact de supabase/config.toml
// ([auth] minimum_password_length = 12, password_requirements =
// "lower_upper_letters_digits"). Le serveur reste l'autorité : ce contrôle
// sert seulement à afficher l'erreur avant l'envoi. Changer l'un = changer l'autre.

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH} caractères minimum, avec une minuscule, une majuscule et un chiffre`;

/** Message d'erreur en français, ou null si le mot de passe est accepté. */
export function passwordError(pwd: string): string | null {
  if (pwd.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères`;
  }
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return 'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre';
  }
  return null;
}
