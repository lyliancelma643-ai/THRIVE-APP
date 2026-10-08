/**
 * Espace d'arrivée selon le rôle. Utilisé partout où l'on redirige après
 * connexion (page login, middleware, transit /dashboard) : on va DIRECTEMENT à
 * la bonne page, sans transiter par /dashboard puis /parent — chaque étape
 * coûtait un aller-retour serveur de plus. Sans dépendance : importable depuis
 * le middleware (edge) comme depuis le client.
 */
export const UNCONFIGURED_PATH = '/compte-non-configure';

/** Rôles qui ont un espace dans l'app web. */
export const WORKSPACE_ROLES = ['PARENT', 'COACH', 'ADMIN', 'SUPER_ADMIN'] as const;

export function hasWorkspace(role?: string | null): boolean {
  return !!role && (WORKSPACE_ROLES as readonly string[]).includes(role);
}

/**
 * Rôle inconnu (CHILD, valeur vide ou future) → écran « compte non configuré »
 * avec bouton de déconnexion, jamais une boucle de redirections entre un
 * layout et /dashboard. Un rôle absent du store client (profil pas encore
 * chargé) reste envoyé vers l'espace parent : le middleware, qui lit le JWT,
 * tranche.
 */
export function homeForRole(role?: string | null): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'COACH':
      return '/coach/dashboard';
    case 'PARENT':
    case undefined:
    case null:
      return '/parent/fitness';
    default:
      return UNCONFIGURED_PATH;
  }
}
