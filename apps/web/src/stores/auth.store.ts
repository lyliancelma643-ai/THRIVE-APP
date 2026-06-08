import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IAuthState, IAuthTokens, IAuthUser } from '@thrive/shared';
import { supabaseClient as supabase } from '@thrive/shared';

type AuthStore = IAuthState & {
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
};

function mapSession(supabaseSession: any): { user: IAuthUser; session: IAuthTokens } {
  if (typeof document !== 'undefined') {
    document.cookie = `sb-access-token=${supabaseSession.access_token}; path=/; max-age=${supabaseSession.expires_in || 3600}; SameSite=Lax; secure`;
  }
  return {
    user: {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      firstName: supabaseSession.user.user_metadata?.firstName,
      lastName: supabaseSession.user.user_metadata?.lastName,
      role: supabaseSession.user.user_metadata?.role,
    },
    session: {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: supabaseSession.expires_at,
    },
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,

      hydrate: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          if (typeof document !== 'undefined') document.cookie = 'sb-access-token=; path=/; max-age=0';
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
        if (typeof document !== 'undefined') document.cookie = 'sb-access-token=; path=/; max-age=0';
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'thrive-auth',
      partialize: (state) => ({ user: state.user, session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
);
