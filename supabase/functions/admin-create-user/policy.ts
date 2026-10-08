// Règles pures d'admin-create-user (testables sans Supabase).

export type CreationPlan =
  | { ok: true; mode: 'invite' | 'direct' }
  | { ok: false; status: number; error: string };

/**
 * Qui peut créer quoi, et comment :
 *  - ADMIN / SUPER_ADMIN : comptes confirmés avec mot de passe (mode 'direct'),
 *    ADMIN réservé au SUPER_ADMIN ;
 *  - PARENT : uniquement un co-parent, par INVITATION e-mail (mode 'invite') :
 *    jamais de compte confirmé avec un mot de passe que le parent a choisi.
 */
export function planCreation(callerRole: string, targetRole: string): CreationPlan {
  const isAdminCaller = callerRole === 'ADMIN' || callerRole === 'SUPER_ADMIN';
  if (!['PARENT', 'COACH', 'ADMIN'].includes(targetRole)) {
    return { ok: false, status: 400, error: 'Rôle invalide (PARENT, COACH ou ADMIN)' };
  }
  if (targetRole === 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
    return { ok: false, status: 403, error: 'Seul un SUPER_ADMIN peut créer un compte ADMIN' };
  }
  if (isAdminCaller) return { ok: true, mode: 'direct' };
  if (callerRole === 'PARENT' && targetRole === 'PARENT') return { ok: true, mode: 'invite' };
  return { ok: false, status: 403, error: 'Accès refusé' };
}

/** Quota « comptes parents » du forfait (plans.limits.maxParents) : null = illimité. */
export function parentQuotaReached(currentMembers: number, maxParents: number | null | undefined): boolean {
  return maxParents != null && currentMembers >= maxParents;
}

/** Miroir de supabase/config.toml : 12 caractères, minuscule + majuscule + chiffre. */
export function passwordProblem(pwd: string): string | null {
  if (pwd.length < 12) return 'Le mot de passe doit faire au moins 12 caractères';
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return 'Le mot de passe doit contenir une minuscule, une majuscule et un chiffre';
  }
  return null;
}
