import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabaseClient as supabase } from '@thrive/shared';

/**
 * Enfant sélectionné, partagé par tout l'espace parent (même logique que le store web `child.store.ts`) :
 * familles dont on est le parent principal ET celles où l'on est co-parent (family_members) ; l'enfant choisi
 * est retenu sur l'appareil. Changer d'enfant dans l'en-tête change Maison, Bilan et Mes séances d'un coup.
 */
export type ChildProfile = {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  nickname: string | null;
  jersey_number: number | null;
  accent_color: string | null;
};

const KEY = 'thrive.selectedChild';

type ChildStore = {
  children: ChildProfile[];
  selectedChildId: string | null;
  isLoading: boolean;
  /** Vrai après le premier chargement (même vide). */
  loaded: boolean;
  loadChildren: (parentId: string) => Promise<void>;
  selectChild: (childId: string) => void;
  reset: () => void;
};

let inFlight: Promise<void> | null = null;

export const useChildStore = create<ChildStore>((set, get) => ({
  children: [],
  selectedChildId: null,
  isLoading: false,
  loaded: false,

  loadChildren: async (parentId) => {
    // Une lecture à la fois ; un raté réseau n'efface JAMAIS la liste connue (et n'invente pas « aucun enfant »).
    if (inFlight) return inFlight;
    set({ isLoading: true });
    inFlight = (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, attempt === 1 ? 800 : 2000));
        try {
          const [families, memberships, stored] = await Promise.all([
            supabase.from('families').select('id').eq('parent_id', parentId),
            supabase.from('family_members').select('family_id').eq('profile_id', parentId),
            AsyncStorage.getItem(KEY).catch(() => null),
          ]);
          // Une erreur de lecture n'est PAS « aucune famille » : on réessaie.
          if (families.error || memberships.error) continue;
          const familyIds = Array.from(
            new Set([
              ...((families.data ?? []) as { id: string }[]).map((f) => f.id),
              ...((memberships.data ?? []) as { family_id: string }[]).map((m) => m.family_id),
            ]),
          );
          if (familyIds.length === 0) {
            set({ children: [], isLoading: false, loaded: true, selectedChildId: null });
            return;
          }
          const res = await supabase
            .from('children')
            .select('id, family_id, first_name, last_name, date_of_birth, avatar_url, nickname, jersey_number, accent_color')
            .in('family_id', familyIds)
            .eq('is_active', true)
            .order('created_at');
          if (res.error) continue;
          const list = (res.data ?? []) as ChildProfile[];
          const current = get().selectedChildId ?? stored;
          const selectedChildId = current && list.some((c) => c.id === current) ? current : list[0]?.id ?? null;
          set({ children: list, isLoading: false, loaded: true, selectedChildId });
          return;
        } catch {
          // essai suivant
        }
      }
      // Échec durable : on garde la liste connue ; sans rien en mémoire, `loaded` reste faux (les écrans proposent « Réessayer »).
      set({ isLoading: false });
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  },

  selectChild: (childId) => {
    set({ selectedChildId: childId });
    AsyncStorage.setItem(KEY, childId).catch(() => {});
  },

  reset: () => set({ children: [], selectedChildId: null, isLoading: false, loaded: false }),
}));

/** L'enfant sélectionné (ou null). */
export function useSelectedChild(): ChildProfile | null {
  return useChildStore((s) => s.children.find((c) => c.id === s.selectedChildId) ?? null);
}

/** Âge exact (« Léa · 12 ans » de l'en-tête web). */
export function ageFromDob(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}
