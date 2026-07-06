import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.auth.getUser(accessToken);

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
