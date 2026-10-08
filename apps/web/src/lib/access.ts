import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';
import { asProgramPack, type ProgramPack } from './program-packs';

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
  /** Abonnement P3 actif (le sien ou celui du titulaire de la famille). */
  p3Subscribed: boolean;
  /** Accès à « Maison » : pack THRIVE, compte activé, abonné P3 ou forçage admin (migration 068). */
  p3Access: boolean;
  /** Pack THRIVE acheté (Groupe / Individuel / Complet), null = aucun. */
  programPack: ProgramPack | null;
  /** Accès aux onglets Bilan et Mes séances (automatique ou forcé par l'admin, migration 068). */
  bilanAccess: boolean;
  seancesAccess: boolean;
};

const OPEN_FALLBACK: AccessState = {
  role: 'PARENT',
  unlocked: true,
  hasChild: true,
  hasConfirmedChild: true,
  coachValidated: true,
  fitnessEnabled: true,
  p3Subscribed: false,
  p3Access: true,
  programPack: null,
  bilanAccess: true,
  seancesAccess: true,
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
    const unlocked = d.unlocked === true;
    set({
      access: {
        role: String(d.role ?? 'PARENT'),
        unlocked,
        hasChild: d.has_child === true,
        hasConfirmedChild: d.has_confirmed_child === true,
        coachValidated: d.coach_validated === true,
        fitnessEnabled: d.fitness_enabled === true,
        p3Subscribed: d.p3_subscribed === true,
        // Avant la migration 064 la clé n'existe pas : on retombe sur `unlocked`.
        p3Access: typeof d.p3_access === 'boolean' ? d.p3_access : unlocked,
        // Avant la migration 068 : pas de pack ni de forçage, on retombe sur `unlocked`.
        programPack: asProgramPack(d.program_pack),
        bilanAccess: typeof d.bilan_access === 'boolean' ? d.bilan_access : unlocked,
        seancesAccess: typeof d.seances_access === 'boolean' ? d.seances_access : unlocked,
      },
      isLoading: false,
    });
  },
}));

/**
 * Pourquoi Bilan / Mes séances est fermé :
 *   • 'pending'      → parcours coaché en cours d'activation (aperçu « ton espace se prépare ») ;
 *   • 'not_included' → abonné Maison seul (sans pack THRIVE), ou section fermée
 *                      manuellement par l'admin alors que le compte est activé :
 *                      on l'invite à prendre un des trois packs.
 */
export function sectionLockReason(access: AccessState): 'pending' | 'not_included' {
  if (access.unlocked) return 'not_included';
  return access.p3Subscribed && !access.programPack ? 'not_included' : 'pending';
}

// Messages in-app — ton cordial, premium, orienté accompagnement humain.
export const ACCESS_MESSAGES = {
  welcomeLocked:
    'Bienvenue chez THRIVE. Ton espace se prépare : ton coach finalise ' +
    "l'activation de ton accès complet. Tu découvriras très prochainement " +
    "l'ensemble de ton parcours.",
  sessionsLocked:
    "L'accès à tes séances sera ouvert dès la validation de ton coach. " +
    'Il t’accompagnera personnellement pour démarrer.',
  fitnessConstruction:
    'Cette section est actuellement en construction. Elle sera bientôt disponible.',
  childPending:
    'La fiche de ton enfant a bien été enregistrée. Elle est en cours de ' +
    "validation par notre équipe avant l'ouverture complète de ton espace.",
  childRequired:
    'Pour personnaliser le parcours de ta famille, commence par créer la ' +
    'fiche de ton enfant. Ton coach prendra ensuite le relais.',
} as const;
