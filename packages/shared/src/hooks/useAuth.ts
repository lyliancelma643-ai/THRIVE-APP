import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../lib/supabase';
import type { UserRole } from '../enums/roles.enum';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** Autorité du rôle = app_metadata (non modifiable par l'utilisateur). */
  role?: UserRole;
}

function mapUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    firstName: session.user.user_metadata?.firstName,
    lastName: session.user.user_metadata?.lastName,
    role: session.user.app_metadata?.role,
  };
}

/**
 * Hook d'authentification partagé (web + mobile).
 * Expose la session Supabase courante et se resynchronise via onAuthStateChange.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session ? mapUser(data.session) : null);
      setIsLoading(false);
    });

    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      setUser(newSession ? mapUser(newSession) : null);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabaseClient.auth.signOut();
  };

  return { user, session, isAuthenticated: !!session, isLoading, signOut };
}
