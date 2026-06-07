/**
 * Enum des rôles utilisateurs THRIVE
 * Exporté comme `UserRole` ET `Role` pour compatibilité backend/frontend
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COACH = 'COACH',
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

// Alias pour rétrocompatibilité
export { UserRole as Role };
