import { create } from 'zustand';

/**
 * Une page DÉJÀ visitée se relit en silence : chaque relecture incrémente `tick`, et le filet de 2 px sous l'en-tête
 * (HairlineRefresh) balaie une fois. Jamais appelé à la première visite (le squelette s'en charge).
 */
type RevalidateState = { tick: number; ping: () => void };

export const useRevalidateStore = create<RevalidateState>((set) => ({
  tick: 0,
  ping: () => set((s) => ({ tick: s.tick + 1 })),
}));
