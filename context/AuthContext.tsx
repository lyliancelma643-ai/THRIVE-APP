/**
 * AuthContext — Source unique de vérité pour l'authentification et les rôles.
 *
 * Flux :
 *  1. Au montage, on récupère la session Supabase existante.
 *  2. onAuthStateChange écoute les changements en temps réel.
 *  3. Quand un user est connecté, on lit son rôle depuis `profiles.role`.
 *  4. Le RootLayout redirige selon le rôle :
 *       parent  → /(parent)/dashboard
 *       coach   → /(coach)
 *       admin   → /(admin)
 *       athlete → /(tabs)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'athlete' | 'parent' | 'coach' | 'admin' | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    role: null,
    loading: true,
  });

  const fetchRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !data) return 'athlete'; // fallback par défaut
      return (data.role as UserRole) ?? 'athlete';
    } catch {
      return 'athlete';
    }
  }, []);

  useEffect(() => {
    // Charger session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchRole(session.user.id);
        setState({ session, user: session.user, role, loading: false });
      } else {
        setState({ session: null, user: null, role: null, loading: false });
      }
    });

    // Écoute des changements auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const role = await fetchRole(session.user.id);
          setState({ session, user: session.user, role, loading: false });
        } else {
          setState({ session: null, user: null, role: null, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
