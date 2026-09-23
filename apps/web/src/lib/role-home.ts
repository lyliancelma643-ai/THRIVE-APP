/**
 * Espace d'arrivée selon le rôle. Utilisé partout où l'on redirige après
 * connexion (page login, middleware, transit /dashboard) : on va DIRECTEMENT à
 * la bonne page, sans transiter par /dashboard puis /parent — chaque étape
 * coûtait un aller-retour serveur de plus. Sans dépendance : importable depuis
 * le middleware (edge) comme depuis le client.
 */
export function homeForRole(role?: string | null): string {
  switch (role) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'COACH':
      return '/coach/dashboard';
    default:
      return '/parent/bilans';
  }
}
