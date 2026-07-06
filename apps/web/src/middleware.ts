import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const accessToken = request.cookies.get('sb-access-token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fail-closed : toute erreur (réseau, init client, token illisible) redirige
  // vers /login au lieu de laisser le middleware crasher (500).
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let userData: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    userData = await supabase.auth.getUser(accessToken);
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { data, error } = userData;
  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Vérification du rôle selon le path.
  // Source d'autorité UNIQUE : app_metadata.role (posé par les edge functions
  // via la clé service, NON modifiable par l'utilisateur).
  // On NE retombe PAS sur user_metadata.role : ce champ est modifiable par
  // l'utilisateur lui-même (auth.updateUser) → un repli dessus permettrait une
  // escalade de privilèges verticale (se déclarer ADMIN pour franchir ce gate).
  const matchedPath = Object.keys(ROLE_PATHS).find((p) => pathname.startsWith(p));
  if (matchedPath) {
    const userRole = data.user.app_metadata?.role as string | undefined;
    if (!userRole || !ROLE_PATHS[matchedPath].includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/parent/:path*', '/coach/:path*', '/admin/:path*'],
};
