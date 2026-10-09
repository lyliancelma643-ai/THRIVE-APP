// État d'accès de l'espace parent, lu dans access_state() (migration 080).
// Module pur (testé) : AUCUN calcul de droit ici, on ne fait que lire le
// verdict du serveur — override Super Admin > pack > abonnement Maison > rien.
// Une clé absente = section fermée (jamais d'ouverture par défaut).

export type SectionMode = 'complet' | 'lecture' | 'verrouille';
export type ParentAccess = {
  maison: boolean;
  bilan: boolean;
  seances: boolean;
  modes: { bilan: SectionMode; seances: SectionMode };
  sourceMaison: string;
  /** Parcours prêt (enfant confirmé + coach) : information d'affichage seulement. */
  unlocked: boolean;
  isStaff: boolean;
  packEnd: string | null;
  trialUsed: boolean;
};

const asMode = (v: unknown, open: boolean): SectionMode =>
  v === 'complet' || v === 'lecture' || v === 'verrouille' ? v : open ? 'complet' : 'verrouille';

export function parseParentAccess(data: unknown): ParentAccess | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.role !== 'string') return null;
  const sections = (d.sections ?? {}) as Record<string, unknown>;
  const pick = (k: 'maison' | 'bilan' | 'seances', legacy: unknown) =>
    typeof sections[k] === 'boolean' ? (sections[k] as boolean) : legacy === true;
  const bilan = pick('bilan', d.bilan_access);
  const seances = pick('seances', d.seances_access);
  return {
    maison: pick('maison', d.p3_access),
    bilan,
    seances,
    modes: { bilan: asMode(d.bilan_mode, bilan), seances: asMode(d.seances_mode, seances) },
    sourceMaison: typeof d.source_maison === 'string' ? d.source_maison : 'aucune',
    unlocked: d.unlocked === true,
    isStaff: d.is_staff === true,
    packEnd: typeof d.pack_fin === 'string' ? d.pack_fin : null,
    trialUsed: d.trial_used === true,
  };
}

/** Ce que montre l'onglet Bilan / Séances. */
export function sectionView(a: ParentAccess, s: 'bilan' | 'seances'): 'locked' | 'readonly' | 'open' {
  const m = a.modes[s];
  return m === 'verrouille' ? 'locked' : m === 'lecture' ? 'readonly' : 'open';
}

// Actions des onglets verrouillés. Anti-steering (Apple 3.1.1 / Google Play) :
// jamais de paiement ni de lien vers le site des packs. La vidéo n'apparaît
// que si une page vidéo dédiée est configurée ; le coach = messagerie in-app
// ou page de rendez-vous configurée.
export const PROGRAM_VIDEO_URL: string | null = process.env.EXPO_PUBLIC_PROGRAM_VIDEO_URL || null;
export const COACH_CALL_URL: string | null = process.env.EXPO_PUBLIC_COACH_CALL_URL || null;
