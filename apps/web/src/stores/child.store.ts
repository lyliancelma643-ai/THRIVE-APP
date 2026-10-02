import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabaseClient as supabase } from '@thrive/shared';
import type { ChildProfile } from '@/lib/catalog';
import { fetchMyFamilies } from '@/lib/family';

type ChildStore = {
  children: ChildProfile[];
  selectedChildId: string | null;
  isLoading: boolean;
  loadChildren: (parentId: string) => Promise<void>;
  selectChild: (childId: string) => void;
  selectedChild: () => ChildProfile | null;
};

export const useChildStore = create<ChildStore>()(
  persist(
    (set, get) => ({
      children: [],
      selectedChildId: null,
      isLoading: false,

      loadChildren: async (parentId: string) => {
        set({ isLoading: true });
        // Titulaire OU co-parent (family_members) : les deux parents voient les enfants.
        const familyIds = (await fetchMyFamilies(parentId)).map((f) => f.id);
        if (familyIds.length === 0) {
          set({ children: [], isLoading: false });
          return;
        }

        const { data: children } = await supabase
          .from('children')
          .select(
            'id, family_id, first_name, last_name, date_of_birth, avatar_url, nickname, jersey_number, accent_color, sport'
          )
          .in('family_id', familyIds)
          .eq('is_active', true)
          .order('created_at');

        const list = (children ?? []) as ChildProfile[];
        const current = get().selectedChildId;
        set({
          children: list,
          isLoading: false,
          selectedChildId:
            current && list.some((c) => c.id === current) ? current : list[0]?.id ?? null,
        });
      },

      selectChild: (childId: string) => set({ selectedChildId: childId }),

      selectedChild: () => {
        const { children, selectedChildId } = get();
        return children.find((c) => c.id === selectedChildId) ?? null;
      },
    }),
    {
      name: 'thrive-selected-child',
      partialize: (state) => ({ selectedChildId: state.selectedChildId }),
    }
  )
);
