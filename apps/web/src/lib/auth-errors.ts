// Traduit les messages techniques de Supabase Auth (en anglais) en messages
// lisibles par un parent. Partagé par la connexion, l'inscription, la
// réinitialisation du mot de passe et la page Compte : un seul vocabulaire,
// et jamais de message brut en anglais à l'écran.

export const AUTH_GENERIC_ERROR = 'Une erreur est survenue. Réessaie dans un instant.';

export function humanAuthError(raw: unknown): string {
  const msg =
    typeof raw === 'string'
      ? raw
      : raw && typeof raw === 'object' && 'message' in raw
        ? String((raw as { message: unknown }).message ?? '')
        : '';
  if (!msg) return AUTH_GENERIC_ERROR;

  if (/invalid login|invalid credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/fetch|network|abort|timed? ?out|load failed/i.test(msg))
    return 'Connexion lente ou interrompue. Vérifie ton réseau et réessaie.';
  if (/already|exist|registered/i.test(msg)) return 'Un compte existe déjà avec cet email.';
  if (/session.*missing|not authenticated|jwt/i.test(msg))
    return 'Ta session a expiré. Reconnecte-toi puis réessaie.';
  if (/expired|invalid.*(token|link|code)|otp/i.test(msg))
    return 'Ce lien a expiré ou a déjà servi. Redemande un nouvel email.';
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(msg))
    return "L'adresse email n'est pas valide.";
  if (/different from the old|same.*password/i.test(msg))
    return "Choisis un mot de passe différent de l'ancien.";
  if (/security purposes|after \d+ seconds/i.test(msg))
    return 'Par sécurité, patiente une minute avant de redemander un lien.';
  if (/rate|too many/i.test(msg)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (/password/i.test(msg) && /weak|short|least|guess|pwned|characters/i.test(msg))
    return 'Mot de passe trop faible : au moins 8 caractères, évite les mots de passe courants.';
  return AUTH_GENERIC_ERROR;
}
