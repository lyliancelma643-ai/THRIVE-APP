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

// Le middleware Next lit le token dans ce cookie pour protéger les routes
function syncAuthCookie(accessToken: string | null) {
  if (typeof document === 'undefined') return;
  if (accessToken) {
    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = 'sb-access-token=; path=/; max-age=0';
  }
}

// Mémorise (hors URL, robuste aux courses de navigation) qu'une session a été
// coupée car le compte est désactivé. Lu puis effacé par la page de connexion.
export function markDisabledLogout() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem('thrive_logout_reason', 'disabled');
  } catch {
    /* sessionStorage indisponible (mode privé) : on ignore */
  }
}

function mapSession(supabaseSession: any): { user: IAuthUser; session: IAuthTokens } {
  return {
    user: {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      firstName: supabaseSession.user.user_metadata?.firstName,
      lastName: supabaseSession.user.user_metadata?.lastName,
      // Autorité du rôle = app_metadata (non modifiable par l'utilisateur),
      // repli sur user_metadata pour les sessions pas encore rafraîchies.
      role: supabaseSession.user.app_metadata?.role
        ?? supabaseSession.user.user_metadata?.role,
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
      // Démarre à true : tant que hydrate() n'a pas confirmé la session, les
      // gardes de layout (admin/parent/coach) attendent au lieu de rediriger
      // vers /login. Évite le rebond au rechargement / deep-link d'une sous-page.
      isLoading: true,

      hydrate: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          set({ user: null, session: null, isAuthenticated: false, isLoading: false });
          return;
        }
        const mapped = mapSession(data.session);

        // Backstop désactivation : un compte banni peut conserver un JWT en
        // cache valide jusqu'à ~1 h. On revérifie is_active au chargement et on
        // coupe la session si le compte a été désactivé entre-temps.
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', mapped.user.id)
          .single();
        if (prof && prof.is_active === false) {
          markDisabledLogout();
          await supabase.auth.signOut();
          syncAuthCookie(null);
          set({ user: null, session: null, isAuthenticated: false, isLoading: false });
          return;
        }

        syncAuthCookie(data.session.access_token);
        set({ ...mapped, isAuthenticated: true, isLoading: false });
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { set({ isLoading: false }); throw error; }
        const mapped = mapSession(data.session);
        syncAuthCookie(data.session.access_token);
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

      // Déconnexion à toute épreuve : même si l'appel réseau à Supabase échoue
      // (hors-ligne, token déjà expiré), on purge SYSTÉMATIQUEMENT la session
      // locale — sinon hydrate() restaurerait la session au prochain chargement
      // et l'utilisateur resterait « connecté » malgré le clic sur Déconnexion.
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // Repli purement local (aucun appel réseau) : garantit l'effacement
          // du token Supabase même sans connexion.
          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch {
            /* rien de plus à faire : on force le nettoyage ci-dessous */
          }
        }
        syncAuthCookie(null);
        // Efface aussi le profil enfant persistant pour ne pas le montrer à un
        // autre compte connecté ensuite sur le même navigateur.
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('thrive-selected-child');
          } catch {
            /* stockage indisponible : ignoré */
          }
        }
        set({ user: null, session: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'thrive-auth',
      partialize: (state) => ({ user: state.user, session: state.session, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Déconnexion complète depuis l'UI : purge la session puis force un rechargement
// dur de /login. Le `location.replace` (et non push) garantit : (1) qu'aucun état
// React, abonnement realtime ou timer ne survit, (2) que l'utilisateur ne peut pas
// « revenir » dans l'app authentifiée via le bouton précédent.
export async function logout() {
  try {
    await useAuthStore.getState().signOut();
  } finally {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }
}

// ── Synchronisation permanente avec Supabase Auth ────────────────────────────
// Supabase renouvelle le token automatiquement en arrière-plan (~1 h) ; sans
// cet écouteur, le cookie middleware et le store devenaient obsolètes et
// l'app « décrochait » de Supabase jusqu'à reconnexion manuelle.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
      if (session) {
        syncAuthCookie(session.access_token);
        const mapped = mapSession(session);
        useAuthStore.setState({ ...mapped, isAuthenticated: true, isLoading: false });
      }
    }
    if (event === 'SIGNED_OUT') {
      syncAuthCookie(null);
      useAuthStore.setState({ user: null, session: null, isAuthenticated: false, isLoading: false });
    }
  });
}
