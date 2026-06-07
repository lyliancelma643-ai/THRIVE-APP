import { create } from 'zustand';
import { IAuthState, IAuthUser, IAuthTokens } from '@thrive/shared';
import { supabase } from '../services/supabase';

type AuthStore = IAuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
  setLoading: (value: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,

  setLoading: (value) => set({ isLoading: value }),

  hydrate: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const user: IAuthUser = {
      id: data.session.user.id,
      email: data.session.user.email || '',
      firstName: data.session.user.user_metadata?.firstName,
      lastName: data.session.user.user_metadata?.lastName,
      role: data.session.user.user_metadata?.role,
    };

    const session: IAuthTokens = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    };

    set({ user, session, isAuthenticated: true, isLoading: false });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
      throw error;
    }

    const user: IAuthUser = {
      id: data.user.id,
      email: data.user.email || '',
      firstName: data.user.user_metadata?.firstName,
      lastName: data.user.user_metadata?.lastName,
      role: data.user.user_metadata?.role,
    };

    const session: IAuthTokens = {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    };

    set({ user, session, isAuthenticated: true, isLoading: false });
  },

  signUp: async (email, password, metadata) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata || {} },
    });

    if (error) {
      set({ isLoading: false });
      throw error;
    }

    const user: IAuthUser = data.user
      ? {
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.firstName,
          lastName: data.user.user_metadata?.lastName,
          role: data.user.user_metadata?.role,
        }
      : null;

    const session: IAuthTokens | null = data.session
      ? {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        }
      : null;

    set({ user, session, isAuthenticated: !!session, isLoading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, isLoading: false });
  },
}));
