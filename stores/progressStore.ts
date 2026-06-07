import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProgressState {
  // Metrics
  watchedMinutes: number;
  completedSessions: number;
  currentStreak: number;
  lastSessionDate: string | null;
  
  // Hydration status
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // Goals (Weekly)
  goalWatchedMinutes: number;
  goalCompletedSessions: number;
  goalStreak: number;

  // Actions
  addWatchedTime: (minutes: number) => void;
  incrementCompletedSessions: () => void;
  incrementStreak: () => void;
  resetProgress: () => void; // Pour la réinitialisation hebdomadaire par exemple
}

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      // Valeurs initiales (vides au départ, pour éviter les sauts)
      watchedMinutes: 0,
      completedSessions: 0,
      currentStreak: 0,
      lastSessionDate: null,
      
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),
      
      // Objectifs par défaut
      goalWatchedMinutes: 15,
      goalCompletedSessions: 2,
      goalStreak: 3,

      addWatchedTime: (minutes) => 
        set((state) => ({ watchedMinutes: state.watchedMinutes + minutes })),
        
      incrementCompletedSessions: () => 
        set((state) => ({ completedSessions: state.completedSessions + 1 })),
        
      incrementStreak: () => {
        const now = new Date();
        const state = get();
        
        if (!state.lastSessionDate) {
          // Première fois qu'il regarde une vidéo
          set({ currentStreak: 1, lastSessionDate: now.toISOString() });
          return;
        }

        const lastDate = getStartOfDay(new Date(state.lastSessionDate));
        const today = getStartOfDay(now);
        
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 0) {
          // Déjà regardé aujourd'hui, on ne fait rien
          return;
        } else if (diffDays === 1) {
          // Il a regardé hier, on ajoute +1 à la streak
          set((state) => ({ 
            currentStreak: state.currentStreak + 1, 
            lastSessionDate: now.toISOString() 
          }));
        } else {
          // Il a loupé un jour, on remet à 1
          set({ currentStreak: 1, lastSessionDate: now.toISOString() });
        }
      },
        
      resetProgress: () => 
        set({ 
          watchedMinutes: 0, 
          completedSessions: 0, 
          currentStreak: 0, 
          lastSessionDate: null 
        }),
    }),
    {
      name: 'thrive-progress-storage', // Nom de la clé dans le storage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
