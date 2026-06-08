import { create } from 'zustand';
import { IAuthState, IAuthTokens, IAuthUser } from '@thrive/shared';
import { supabase } from '../services/supabase';

export type UserRole = 'athlete' | 'parent' | 'coach' | 'admin';

type AuthStore = IAuthState & {
  role: UserRole | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Récupère le rôle en priorité depuis :
 *  1. La table `profiles` (source de vérité)
 *  2. user_metadata.role (fallback si profile absent)
 *  3. 'athlete' par défaut
 */
async function fetchRole(userId: string, metaRole?: string): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!error && data?.role) return data.role as UserRole;
  } catch {
    // ignore, on utilise le fallback
  }
  return (metaRole as UserRole) ?? 'athlete';
}

function mapSession(s: any, role: UserRole): { user: IAuthUser; session: IAuthTokens; role: UserRole } {
  return {
    user: {
      id: s.user.id,
      email: s.user.email ?? '',
      firstName: s.user.user_metadata?.firstName,
      lastName: s.user.user_metadata?.lastName,
      role,
    },
    session: {
      accessToken: s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: s.expires_at,
    },
    role,
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      set({ user: null, session: null, role: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const role = await fetchRole(
      data.session.user.id,
      data.session.user.user_metadata?.role
    );
    const mapped = mapSession(data.session, role);
    set({ ...mapped, isAuthenticated: true, isLoading: false });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { set({ isLoading: false }); throw error; }
    const role = await fetchRole(
      data.session.user.id,
      data.session.user.user_metadata?.role
    );
    const mapped = mapSession(data.session, role);
    set({ ...mapped, isAuthenticated: true, isLoading: false });
  },

  signUp: async (email, password, metadata) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: metadata ?? {} },
    });
    if (error) { set({ isLoading: false }); throw error; }
    if (data.session) {
      const role = await fetchRole(
        data.session.user.id,
        data.session.user.user_metadata?.role
      );
      const mapped = mapSession(data.session, role);
      set({ ...mapped, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null, isAuthenticated: false, isLoading: false });
  },
}));
