import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IAuthState, IAuthTokens, IAuthUser } from '@thrive/shared';
import { supabaseClient as supabase } from '@thrive/shared';

type AuthStore = IAuthState & {
  /**
   * true dès que la session a été CONFIRMÉE auprès de Supabase pendant cette
   * visite (hydrate, connexion ou évènement auth). Non persisté : l'état
   * `isAuthenticated` relu du localStorage peut être périmé (token expiré,
   * session révoquée) et ne doit jamais, seul, déclencher une redirection.
   */
  sessionVerified: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  signOut: () => Promise<void>;
};

// Le middleware Next lit le token dans ce cookie pour protéger les routes
function syncAuthCookie(accessToken: string | null) {
  if (typeof document === 'undefined') return;
  if (accessToken) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=604800; SameSite=Lax${secure}`;
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
      // Autorité du rôle = app_metadata UNIQUEMENT (non modifiable par
      // l'utilisateur). Pas de repli sur user_metadata.role : ce champ est
      // modifiable via auth.updateUser → un repli usurperait l'UI admin/coach.
      // Vérifié : les 6 comptes ont app_metadata.role peuplé (aucun lockout).
      role: supabaseSession.user.app_metadata?.role,
    },
    session: {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: supabaseSession.expires_at,
    },
  };
}

export { homeForRole } from '@/lib/role-home';

// Délai maximal accordé à la vérification de session avant de rendre la main
// à l'UI. Au-delà (réseau qui traîne), on affiche le formulaire plutôt qu'un
// spinner sans fin ; si la session finit par être confirmée, l'état est mis à
// jour et l'utilisateur est redirigé automatiquement.
const HYDRATE_TIMEOUT_MS = 6_000;

// Dédoublonnage des appels concurrents à hydrate(). La chaîne de connexion
// monte plusieurs gardes coup sur coup (/login → /dashboard → layout d'espace),
// chacune appelant hydrate() au montage. Sans cette garde, chaque appel relance
// getSession() en parallèle et repasse l'UI en chargement. On partage un seul
// appel en vol ; il est libéré dès résolution (dédoublonnage concurrent, pas de
// cache dans le temps — chaque navigation revalide bien la session).
let hydrateInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      // Démarre à true : tant que hydrate() n'a pas confirmé la session, les
      // gardes de layout (admin/parent/coach) attendent au lieu de rediriger
      // vers /login. Évite le rebond au rechargement / deep-link d'une sous-page.
      isLoading: true,
      sessionVerified: false,

      hydrate: async () => {
        if (hydrateInFlight) return hydrateInFlight;

        hydrateInFlight = (async () => {
          // Ne repasse PAS en chargement si une session est déjà confirmée : la
          // navigation entre espaces gardés (dashboard → parent) ne doit pas
          // rebasculer sur le spinner — c'était la cause des re-blocages.
          if (!get().isAuthenticated) set({ isLoading: true });

          type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
          const apply = ({ data, error }: SessionResult) => {
            if (error || !data.session) {
              set({
                user: null, session: null, isAuthenticated: false,
                isLoading: false, sessionVerified: true,
              });
              return null;
            }
            const mapped = mapSession(data.session);
            // Session en main → on DÉBLOQUE l'UI immédiatement. Le rendu ne doit
            // jamais attendre un aller-retour réseau supplémentaire.
            syncAuthCookie(data.session.access_token);
            set({ ...mapped, isAuthenticated: true, isLoading: false, sessionVerified: true });
            return mapped;
          };

          // getSession() est local si le token est encore valide, mais déclenche
          // un rafraîchissement réseau s'il a expiré (cas typique : on rouvre la
          // PWA après plus d'une heure). On borne l'attente pour ne jamais rester
          // bloqué sur le spinner ; le résultat tardif est quand même appliqué.
          const sessionPromise = supabase.auth.getSession();
          const first = await Promise.race([
            sessionPromise,
            new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), HYDRATE_TIMEOUT_MS)),
          ]);
          if (first === 'timeout') {
            set({ isAuthenticated: false, isLoading: false, sessionVerified: true });
            sessionPromise.then(apply).catch(() => {});
            return;
          }
          const mapped = apply(first);
          if (!mapped) return;

          // Backstop désactivation, HORS chemin critique (ne bloque plus le
          // rendu) : un compte banni peut garder un JWT en cache valide jusqu'à
          // ~1 h. On revérifie is_active en arrière-plan et on coupe la session
          // si besoin. AccountSync fait par ailleurs la même revérif en réalité.
          try {
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
            }
          } catch {
            /* réseau indisponible : AccountSync assurera la réconciliation */
          }
        })().finally(() => { hydrateInFlight = null; });

        return hydrateInFlight;
      },

      signIn: async (email, password) => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { set({ isLoading: false }); throw error; }
        const mapped = mapSession(data.session);
        syncAuthCookie(data.session.access_token);
        set({ ...mapped, isAuthenticated: true, isLoading: false, sessionVerified: true });
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
        useAuthStore.setState({ ...mapped, isAuthenticated: true, isLoading: false, sessionVerified: true });
      }
    }
    if (event === 'SIGNED_OUT') {
      syncAuthCookie(null);
      useAuthStore.setState({ user: null, session: null, isAuthenticated: false, isLoading: false });
    }
  });
}
