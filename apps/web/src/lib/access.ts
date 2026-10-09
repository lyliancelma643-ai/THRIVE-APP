import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';
import { asProgramPack, type ParentSection, type ProgramPack } from './program-packs';
import { asPack, type Pack } from './packs';

// ─────────────────────────────────────────────────────────────────────────────
// État d'accès du compte (cycle : enfant créé → confirmé par l'admin →
// validé par le coach → accès complet) + feature flags serveur.
//
// Source de vérité : RPC `access_state()` (SECURITY DEFINER), calculée par
// private.access_compute (migration 080) — override Super Admin > pack >
// abonnement Maison > rien. L'UI ne fait que REFLÉTER cet état, sans aucun
// calcul de droit ; l'enforcement réel est en RLS (même fonction).
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
  /** Niveau de détail des bilans (families.pack) : codes ESSENTIEL / AVANCE / PERFORMANCE = Groupe / Individuel / Complet (migrations 070, 075). */
  bilanLevel: Pack;
  /** Coach / Admin / Super Admin : jamais de paywall (migration 070). */
  isStaff: boolean;
  /** Overrides Super Admin actifs par section : null = automatique, true = ouvert, false = fermé (migration 080). */
  forced: Record<ParentSection, boolean | null>;
  /** Mode d'affichage de Bilan / Mes séances : complet, lecture seule (pack terminé) ou verrouillé (migration 080). */
  modes: Record<'bilan' | 'seances', SectionMode>;
  /** D'où vient l'ouverture de chaque section (migration 080). */
  sources: Record<ParentSection, SectionSource>;
  /** Pack en cours (dates incluses), null = aucun. */
  packStart: string | null;
  packEnd: string | null;
  /** Date de fermeture prévue de Maison (null = pas de fin connue, ou fermée). */
  maisonEndsOn: string | null;
  /** L'essai gratuit de Maison a déjà été consommé sur ce compte. */
  trialUsed: boolean;
};

export type SectionMode = 'complet' | 'lecture' | 'verrouille';
export type SectionSource = 'override' | 'pack' | 'abonnement' | 'historique' | 'staff' | 'aucune';

type AccessStore = {
  access: AccessState | null;
  isLoading: boolean;
  /** La dernière vérification a échoué et aucun état n'est connu. */
  error: boolean;
  /** `silent` : relecture en arrière-plan (retour au premier plan, temps réel) sans écran de chargement. */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
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
  // Jamais d'ouverture par défaut : une clé absente = section fermée.
  const pick = (key: ParentSection, legacy: unknown) =>
    typeof sections[key] === 'boolean' ? (sections[key] as boolean) : legacy === true;
  const bilanAccess = pick('bilan', d.bilan_access);
  const seancesAccess = pick('seances', d.seances_access);
  return {
    role: d.role,
    unlocked,
    hasChild: d.has_child === true,
    hasConfirmedChild: d.has_confirmed_child === true,
    coachValidated: d.coach_validated === true,
    fitnessEnabled: d.fitness_enabled === true,
    p3Subscribed: d.p3_subscribed === true,
    p3Access: pick('maison', d.p3_access),
    programPack: asProgramPack(d.program_pack),
    bilanAccess,
    seancesAccess,
    bilanLevel: asPack(d.bilan_level),
    isStaff: d.is_staff === true,
    forced: { maison: asForced(forced.maison), bilan: asForced(forced.bilan), seances: asForced(forced.seances) },
    modes: {
      bilan: asMode(d.bilan_mode, bilanAccess),
      seances: asMode(d.seances_mode, seancesAccess),
    },
    sources: {
      maison: asSource(d.source_maison),
      bilan: asSource(d.source_bilan),
      seances: asSource(d.source_seances),
    },
    packStart: asDate(d.pack_debut),
    packEnd: asDate(d.pack_fin),
    maisonEndsOn: asDate(d.fin_acces_maison),
    trialUsed: d.trial_used === true,
  };
}

const SOURCES: SectionSource[] = ['override', 'pack', 'abonnement', 'historique', 'staff', 'aucune'];
const asSource = (v: unknown): SectionSource => (SOURCES.includes(v as SectionSource) ? (v as SectionSource) : 'aucune');
const asDate = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
// Sans mode explicite (serveur antérieur à 080) : ouvert = complet, sinon verrouillé.
const asMode = (v: unknown, open: boolean): SectionMode =>
  v === 'complet' || v === 'lecture' || v === 'verrouille' ? v : open ? 'complet' : 'verrouille';

export const useAccessStore = create<AccessStore>((set, get) => ({
  access: null,
  isLoading: true,
  error: false,

  refresh: async (opts) => {
    if (!opts?.silent) set({ isLoading: true });
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
 * Garde l'état d'accès à jour SANS recharger l'app : après un achat, une
 * restauration, un webhook, un override ou un changement de pack.
 *   • temps réel : la ligne access_versions du compte est incrémentée en base
 *     à chaque changement (migration 080) ;
 *   • retour au premier plan (onglet / PWA) ;
 *   • filet toutes les 5 min (échéances : fin d'essai, d'override, de pack).
 * Retourne la fonction d'arrêt.
 */
export function startAccessAutoRefresh(userId: string): () => void {
  const refresh = () => void useAccessStore.getState().refresh({ silent: true });
  const channel = supabase
    .channel(`access-version-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'access_versions', filter: `user_id=eq.${userId}` },
      refresh
    )
    .subscribe();
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  const timer = window.setInterval(refresh, 5 * 60 * 1000);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.clearInterval(timer);
    void supabase.removeChannel(channel);
  };
}

/**
 * Ce que montre l'onglet Bilan / Mes séances — dérivé de access_state(), aucun
 * calcul de droit ici :
 *   • 'locked'    → aperçu factice flouté + cadenas (aucune donnée réelle chargée) ;
 *   • 'readonly'  → pack terminé : historique consultable, rien de nouveau ;
 *   • 'preparing' → section ouverte, mais le parcours n'a pas encore démarré
 *                   (enfant à confirmer, activation coach) : étapes d'activation ;
 *   • 'open'      → contenu complet.
 */
export type SectionView = 'locked' | 'readonly' | 'preparing' | 'open';

export function sectionView(access: AccessState, section: 'bilan' | 'seances'): SectionView {
  const mode = access.modes[section];
  if (mode === 'verrouille') return 'locked';
  if (mode === 'lecture') return 'readonly';
  if (!access.isStaff && !access.unlocked) return 'preparing';
  return 'open';
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
