import { create } from 'zustand';
import { IAuthState, IAuthTokens, IAuthUser } from '@thrive/shared';
import { supabaseClient as supabase } from '@thrive/shared';
import { clearP3Cache } from '../hooks/useP3Data';
import { usePageReadyStore } from './pageReady.store';

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
  // Vrai jusqu'à la relecture de la session enregistrée (Keychain) : le routeur attend, il n'envoie
  // jamais un parent déjà connecté sur l'écran Bienvenue au lancement.
  isLoading: true,

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
      email, password,
      options: { data: metadata ?? {} },
    });
    if (error) { set({ isLoading: false }); throw error; }
    // Pas de confirmation par e-mail : on connecte tout de suite. Si le projet exige encore la
    // confirmation (réglage « Confirm email » ON en prod), signUp ne renvoie pas de session.
    let session = data.session;
    if (!session) {
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (retry.error) {
        set({ isLoading: false });
        const notConfirmed = retry.error.code === 'email_not_confirmed' || /email not confirmed/i.test(retry.error.message);
        throw notConfirmed
          ? new Error('Ton compte est créé. Le serveur exige encore la confirmation par e-mail : l’administrateur doit désactiver « Confirm email » dans les réglages d’authentification. Réessaie ensuite de te connecter.')
          : retry.error;
      }
      session = retry.data.session;
    }
    if (!session) { set({ isLoading: false }); throw new Error('Connexion impossible après la création du compte.'); }
    const mapped = mapSession(session);
    set({ ...mapped, isAuthenticated: true, isLoading: false });
  },

  signOut: async () => {
    clearP3Cache();
    usePageReadyStore.getState().reset();
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, isLoading: false });
  },
}));
