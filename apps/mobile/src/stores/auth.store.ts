import { create } from 'zustand';
import { supabase } from '../services/supabase';

// ── Types ───────────────────────────────────────────────────────────────────
// Correspond EXACTEMENT à l'enum user_role de Supabase
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COACH' | 'PARENT' | 'CHILD';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}

interface AuthStore {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

// ── Helper : lire le rôle depuis profiles (source de vérité) ──────────────
async function fetchRole(userId: string): Promise<UserRole> {
  try {
    // Utiliser la fonction RPC get_my_role() créée dans Supabase
    // qui est SECURITY DEFINER et contourne les problèmes RLS
    const { data, error } = await supabase.rpc('get_my_role');
    if (!error && data) return data as UserRole;

    // Fallback : requête directe sur profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profileError && profile?.role) return profile.role as UserRole;
  } catch (e) {
    console.warn('[AuthStore] fetchRole error:', e);
  }
  return 'PARENT'; // défaut sécurisé
}

// ── Store ───────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true, // true par défaut pour bloquer le render jusqu'à hydrate()

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        set({ user: null, role: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const s = data.session;
      const role = await fetchRole(s.user.id);
      set({
        user: {
          id: s.user.id,
          email: s.user.email ?? '',
          firstName: s.user.user_metadata?.firstName,
          lastName: s.user.user_metadata?.lastName,
          role,
        },
        role,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e) {
      console.error('[AuthStore] hydrate error:', e);
      set({ user: null, role: null, isAuthenticated: false, isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
      throw error;
    }
    const role = await fetchRole(data.session.user.id);
    set({
      user: {
        id: data.session.user.id,
        email: data.session.user.email ?? '',
        firstName: data.session.user.user_metadata?.firstName,
        lastName: data.session.user.user_metadata?.lastName,
        role,
      },
      role,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  signUp: async (email, password, role = 'PARENT') => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) {
      set({ isLoading: false });
      throw error;
    }
    if (data.session) {
      const fetchedRole = await fetchRole(data.session.user.id);
      set({
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          role: fetchedRole,
        },
        role: fetchedRole,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, isAuthenticated: false, isLoading: false });
  },
}));
