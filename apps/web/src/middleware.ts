import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { homeForRole } from '@/lib/role-home';

// Fallbacks alignés sur supabase-server.ts : les NEXT_PUBLIC_* peuvent être
// absents du build (ex. plus de .env.local committé) → sans repli, createClient
// recevrait undefined et throw ⇒ MIDDLEWARE_INVOCATION_FAILED sur TOUTE route
// protégée. La clé anon est publique (protégée par la RLS), donc sûre en dur.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkdcgzvdmipmrgkawnky.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZGNnenZkbWlwbXJna2F3bmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDMxNzcsImV4cCI6MjA5NzExOTE3N30.fI0EzwqjGpfWvBMhtk2qW8pETcDkWDmpbuRw9RpdAi4';

const PROTECTED_PATHS = ['/dashboard', '/parent', '/coach', '/admin'];
const ROLE_PATHS: Record<string, string[]> = {
  '/parent': ['PARENT', 'ADMIN', 'SUPER_ADMIN'],
  '/coach': ['COACH', 'ADMIN', 'SUPER_ADMIN'],
  '/admin': ['ADMIN', 'SUPER_ADMIN'],
};

// Client unique par isolat : la clé publique de signature (JWKS) est mise en
// cache par supabase-js entre les requêtes (TTL 10 min).
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function toLogin(request: NextRequest) {
  const url = new URL('/login', request.url);
  // Mémorise la page visée : après (re)connexion on y retourne directement.
  const { pathname, search } = request.nextUrl;
  if (pathname !== '/dashboard') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const accessToken = request.cookies.get('sb-access-token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!accessToken) return toLogin(request);

  // Vérification LOCALE du JWT (signature asymétrique ES256 via la clé publique
  // du projet + expiration) : plus d'aller-retour vers Supabase Auth à chaque
  // navigation — c'était ~3 appels réseau en série pendant la connexion.
  // Repli automatique de supabase-js sur getUser() si le token est en HS256.
  // Fail-closed : toute erreur (réseau, token illisible, expiré) → /login.
  let claims: Record<string, any> | undefined;
  try {
    const { data, error } = await supabase.auth.getClaims(accessToken);
    if (error || !data?.claims?.sub) return toLogin(request);
    claims = data.claims as Record<string, any>;
  } catch {
    return toLogin(request);
  }

  // Vérification du rôle selon le path.
  // Source d'autorité UNIQUE : app_metadata.role (posé par les edge functions
  // via la clé service, NON modifiable par l'utilisateur) — présent dans le JWT
  // signé. On NE retombe PAS sur user_metadata.role : ce champ est modifiable
  // par l'utilisateur lui-même (auth.updateUser) → un repli dessus permettrait
  // une escalade de privilèges verticale (se déclarer ADMIN pour franchir ce gate).
  const userRole = claims.app_metadata?.role as string | undefined;

  // /dashboard n'est qu'une page de transit : on envoie tout de suite vers le
  // bon espace, sans charger la page puis rediriger côté client.
  // Seulement si l'espace cible accepte bien ce rôle (sinon boucle de rebonds).
  const home = userRole ? homeForRole(userRole) : null;
  const homeAllowed = (h: string | null): h is string =>
    !!h && !!userRole && Object.entries(ROLE_PATHS).some(
      ([p, roles]) => h.startsWith(p) && roles.includes(userRole)
    );
  if (pathname === '/dashboard' && homeAllowed(home)) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  const matchedPath = Object.keys(ROLE_PATHS).find((p) => pathname.startsWith(p));
  if (matchedPath) {
    if (!userRole || !ROLE_PATHS[matchedPath].includes(userRole)) {
      return NextResponse.redirect(new URL(homeAllowed(home) ? home : '/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/parent/:path*', '/coach/:path*', '/admin/:path*'],
};
