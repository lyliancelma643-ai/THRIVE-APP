import { create } from 'zustand';
import { IAuthState, IAuthTokens, IAuthUser } from '@thrive/shared';
import { supabaseClient as supabase } from '@thrive/shared';

type AuthStore = IAuthState & {
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
};

function mapSession(s: any): { user: IAuthUser; session: IAuthTokens } {
  return {
    user: {
      id: s.user.id,
      email: s.user.email ?? '',
      firstName: s.user.user_metadata?.firstName,
      lastName: s.user.user_metadata?.lastName,
      // Autorité du rôle = app_metadata (non modifiable par l'utilisateur) ;
      // user_metadata.role serait falsifiable via auth.updateUser.
      role: s.user.app_metadata?.role,
    },
    session: {
      accessToken: s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: s.expires_at,
    },
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      return;
    }
    const mapped = mapSession(data.session);
    set({ ...mapped, isAuthenticated: true, isLoading: false });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { set({ isLoading: false }); throw error; }
    const mapped = mapSession(data.session);
    set({ ...mapped, isAuthenticated: true, isLoading: false });
  },

  signUp: async (email, password, metadata) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: metadata ?? {} },
    });
    if (error) { set({ isLoading: false }); throw error; }
    if (data.session) {
      const mapped = mapSession(data.session);
      set({ ...mapped, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, isLoading: false });
  },
}));
