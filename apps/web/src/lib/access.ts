import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';

// ─────────────────────────────────────────────────────────────────────────────
// État d'accès du compte (cycle : enfant créé → confirmé par l'admin →
// validé par le coach → accès complet) + feature flags serveur.
//
// Source de vérité : RPC `access_state()` (SECURITY DEFINER, migration 035).
// L'UI ne fait que REFLÉTER cet état — l'enforcement réel est en RLS.
//
// Repli si la migration n'est pas encore appliquée (RPC absente) : on se
// comporte comme avant (tout ouvert) pour ne pas briser la prod pendant la
// fenêtre de déploiement code → migration.
// ─────────────────────────────────────────────────────────────────────────────

export type AccessState = {
  role: string;
  unlocked: boolean;
  hasChild: boolean;
  hasConfirmedChild: boolean;
  coachValidated: boolean;
  fitnessEnabled: boolean;
};

const OPEN_FALLBACK: AccessState = {
  role: 'PARENT',
  unlocked: true,
  hasChild: true,
  hasConfirmedChild: true,
  coachValidated: true,
  fitnessEnabled: true,
};

type AccessStore = {
  access: AccessState | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export const useAccessStore = create<AccessStore>((set) => ({
  access: null,
  isLoading: true,

  refresh: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.rpc('access_state');
    if (error || !data) {
      // RPC absente (migration 035 pas encore appliquée) ou erreur réseau :
      // repli « ouvert » — la RLS reste l'autorité côté données.
      set({ access: OPEN_FALLBACK, isLoading: false });
      return;
    }
    const d = data as Record<string, unknown>;
    set({
      access: {
        role: String(d.role ?? 'PARENT'),
        unlocked: d.unlocked === true,
        hasChild: d.has_child === true,
        hasConfirmedChild: d.has_confirmed_child === true,
        coachValidated: d.coach_validated === true,
        fitnessEnabled: d.fitness_enabled === true,
      },
      isLoading: false,
    });
  },
}));

// Messages in-app — ton cordial, premium, orienté accompagnement humain.
export const ACCESS_MESSAGES = {
  welcomeLocked:
    'Bienvenue chez THRIVE. Votre espace se prépare : votre coach finalise ' +
    "l'activation de votre accès complet. Vous découvrirez très prochainement " +
    "l'ensemble de votre parcours.",
  sessionsLocked:
    "L'accès à vos séances sera ouvert dès la validation de votre coach. " +
    'Il vous accompagnera personnellement pour démarrer.',
  fitnessConstruction:
    'Cette section est actuellement en construction. Elle sera bientôt disponible.',
  childPending:
    'La fiche de votre enfant a bien été enregistrée. Elle est en cours de ' +
    "validation par notre équipe avant l'ouverture complète de votre espace.",
  childRequired:
    'Pour personnaliser le parcours de votre famille, commencez par créer la ' +
    'fiche de votre enfant. Votre coach prendra ensuite le relais.',
} as const;
