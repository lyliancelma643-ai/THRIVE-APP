import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';
import { asProgramPack, type ParentSection, type ProgramPack } from './program-packs';
import { asPack, type Pack } from './packs';

// ─────────────────────────────────────────────────────────────────────────────
// État d'accès du compte (cycle : enfant créé → confirmé par l'admin →
// validé par le coach → accès complet) + feature flags serveur.
//
// Source de vérité : RPC `access_state()` (SECURITY DEFINER, migration 035).
// L'UI ne fait que REFLÉTER cet état — l'enforcement réel est en RLS.
//
// Erreur ≠ accès ouvert : si la RPC échoue (réseau, base), on GARDE le dernier
// état connu ; sans état connu, `error` passe à vrai et l'UI affiche
// « Impossible de vérifier ton accès — Réessayer ». Aucun repli « tout ouvert ».
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
  /** Accès à « Maison » : abonnement P3 (propre ou partagé co-parent) ou forçage admin (068, aligné sur 067b). */
  p3Access: boolean;
  /** Pack THRIVE acheté (Groupe / Individuel / Complet), null = aucun. */
  programPack: ProgramPack | null;
  /** Accès aux onglets Bilan et Mes séances (automatique ou forcé par l'admin, migration 068). */
  bilanAccess: boolean;
  seancesAccess: boolean;
  /** Niveau de détail des bilans (families.pack) : Essentiel / Avancé / Performance (migration 070). */
  bilanLevel: Pack;
  /** Coach / Admin / Super Admin : jamais de paywall (migration 070). */
  isStaff: boolean;
  /** Forçages admin par section : null = automatique, true = ouvert, false = fermé (migration 070). */
  forced: Record<ParentSection, boolean | null>;
};

type AccessStore = {
  access: AccessState | null;
  isLoading: boolean;
  /** La dernière vérification a échoué et aucun état n'est connu. */
  error: boolean;
  refresh: () => Promise<void>;
};

// Revue locale de la section Fitness alors que le flag serveur est OFF :
// `NEXT_PUBLIC_FITNESS_PREVIEW=1` dans .env.local. Ignoré hors `next dev` —
// un build de production ne peut jamais l'activer.
export const FITNESS_DEV_PREVIEW =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FITNESS_PREVIEW === '1';

export function isFitnessOpen(access: AccessState): boolean {
  return access.fitnessEnabled || FITNESS_DEV_PREVIEW;
}


const asForced = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

/** Convertit la réponse brute de `access_state()` (fonction pure, testée). */
export function parseAccessState(data: unknown): AccessState | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  // Réponse anonyme / sans rôle : pas un état exploitable.
  if (typeof d.role !== 'string') return null;
  const unlocked = d.unlocked === true;
  const sections = (d.sections ?? {}) as Record<string, unknown>;
  const forced = (d.forced ?? {}) as Record<string, unknown>;
  const pick = (key: ParentSection, legacy: unknown, fallback: boolean) =>
    typeof sections[key] === 'boolean' ? (sections[key] as boolean) : typeof legacy === 'boolean' ? legacy : fallback;
  return {
    role: d.role,
    unlocked,
    hasChild: d.has_child === true,
    hasConfirmedChild: d.has_confirmed_child === true,
    coachValidated: d.coach_validated === true,
    fitnessEnabled: d.fitness_enabled === true,
    p3Subscribed: d.p3_subscribed === true,
    p3Access: pick('maison', d.p3_access, unlocked),
    programPack: asProgramPack(d.program_pack),
    bilanAccess: pick('bilan', d.bilan_access, unlocked),
    seancesAccess: pick('seances', d.seances_access, unlocked),
    bilanLevel: asPack(d.bilan_level),
    isStaff: d.is_staff === true,
    forced: { maison: asForced(forced.maison), bilan: asForced(forced.bilan), seances: asForced(forced.seances) },
  };
}

export const useAccessStore = create<AccessStore>((set, get) => ({
  access: null,
  isLoading: true,
  error: false,

  refresh: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.rpc('access_state');
      const parsed = error ? null : parseAccessState(data);
      if (parsed) {
        set({ access: parsed, isLoading: false, error: false });
        return;
      }
    } catch {
      // réseau coupé : traité comme une erreur ci-dessous
    }
    // Garde le dernier état connu ; sinon signale l'erreur (jamais « tout ouvert »).
    set({ isLoading: false, error: get().access === null });
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
