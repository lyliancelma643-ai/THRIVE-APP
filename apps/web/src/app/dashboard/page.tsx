'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }

    // Redirection selon le rôle
    switch (user?.role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        router.replace('/admin');
        break;
      case 'COACH':
        router.replace('/coach/dashboard');
        break;
      default:
        router.replace('/parent');
        break;
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Page de transit uniquement : la redirection par rôle part dès que la
  // session est connue. On affiche donc toujours le même état de redirection
  // (pas de flash de contenu intermédiaire).
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream" aria-busy>
      <div className="flex flex-col items-center gap-4" role="status" aria-label="Redirection">
        <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-navy-600/60 text-sm font-medium">Redirection vers ton espace…</p>
      </div>
    </main>
  );
}
