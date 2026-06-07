import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // TODO Étape 2.2 : remplacer par vraie lecture de session Supabase SSR.
  // Pour l'instant, on laisse passer pour brancher les pages rapidement.
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
