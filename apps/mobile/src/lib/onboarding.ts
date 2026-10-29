/**
 * Décision de routage de la garde racine (pure, testée) + messages d'erreur d'inscription / création d'enfant.
 * Règle : un PARENT sans aucun enfant (même « en attente de validation ») est ramené à la création d'un enfant,
 * à chaque lancement, jusqu'à ce qu'au moins un enfant existe.
 */

export const CHILD_CREATION_ROUTE = '/(parent)/children';

export type RouteDecision =
  | { kind: 'wait' } // état inconnu : loader, aucune redirection
  | { kind: 'stay' }
  | { kind: 'redirect'; to: string };

export type RouteInput = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | undefined;
  /** Premier segment de la route courante ('(parent)', '(coach)', '(auth)', 'welcome'…). */
  group: string | undefined;
  /** Deuxième segment (ex. 'children'). */
  screen?: string | undefined;
  childrenLoaded: boolean;
  childCount: number;
};

export function homeFor(role: string | undefined): string {
  return role === 'COACH' ? '/(coach)/dashboard' : '/(parent)/maison';
}

export function decideRoute(i: RouteInput): RouteDecision {
  if (i.isLoading) return { kind: 'wait' };
  if (!i.isAuthenticated) {
    return i.group === '(auth)' || i.group === 'welcome' ? { kind: 'stay' } : { kind: 'redirect', to: '/welcome' };
  }
  if (i.role !== 'PARENT') {
    // Coach (les autres rôles sont gérés avant, par déconnexion).
    const wrongPlace = i.group === '(auth)' || i.group === 'welcome' || i.group === '(parent)' || !i.group;
    return wrongPlace ? { kind: 'redirect', to: homeFor(i.role) } : { kind: 'stay' };
  }
  // PARENT : l'existence d'un enfant doit être connue avant toute décision.
  if (!i.childrenLoaded) return { kind: 'wait' };
  if (i.childCount === 0) {
    return i.group === '(parent)' && i.screen === 'children' ? { kind: 'stay' } : { kind: 'redirect', to: CHILD_CREATION_ROUTE };
  }
  const wrongPlace = i.group === '(auth)' || i.group === 'welcome' || i.group === '(coach)' || !i.group;
  return wrongPlace ? { kind: 'redirect', to: homeFor('PARENT') } : { kind: 'stay' };
}

/** Message français lisible pour une erreur d'inscription / de connexion. */
export function authErrorMessage(err: unknown, fallback = 'Inscription impossible. Réessaie.'): string {
  const raw = ((err as { message?: string })?.message ?? '').toString();
  const m = raw.toLowerCase();
  if (!raw) return fallback;
  if (/already registered|already been registered|user_already_exists/.test(m)) return 'Un compte existe déjà avec ce courriel. Connecte-toi ou réinitialise ton mot de passe.';
  if (/invalid email|unable to validate email|email_address_invalid/.test(m)) return 'Ce courriel n’est pas valide.';
  if (/rate limit|too many|over_email_send_rate_limit/.test(m)) return 'Trop de tentatives. Patiente quelques minutes puis réessaie.';
  if (/network|fetch|timeout|timed out/.test(m)) return 'Connexion impossible. Vérifie ton réseau puis réessaie.';
  if (/weak|password/.test(m) && !/[à-ÿ]/i.test(raw)) return 'Mot de passe refusé. Choisis-en un plus robuste.';
  // Messages déjà rédigés en français (ex. confirmation e-mail) : conservés tels quels.
  if (/[àâçéèêëîïôùûü]/i.test(raw) || /^(ton|ta|tes|veuillez|connexion)/i.test(m)) return raw;
  return fallback;
}

/** Message français pour un échec d'enregistrement d'enfant (RLS, réseau…). */
export function childSaveErrorMessage(err: unknown): string {
  const e = err as { message?: string; code?: string };
  const m = (e?.message ?? '').toLowerCase();
  if (e?.code === '42501' || /row-level security|permission denied|rls/.test(m)) {
    return 'Ton compte n’a pas encore l’autorisation d’enregistrer un enfant. Réessaie dans un instant ; si cela continue, écris-nous à support@thrivesportpositive.com.';
  }
  if (/network|fetch|timeout|timed out|failed to/.test(m)) return 'Connexion impossible. Vérifie ton réseau puis touche Continuer pour réessayer.';
  return 'L’enregistrement a échoué. Touche Continuer pour réessayer.';
}
