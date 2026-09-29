'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { BrandLogo } from '@/components/BrandLogo';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Seuls PARENT, ADMIN, SUPER_ADMIN peuvent accéder aux pages /parent
    if (user?.role && !['PARENT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    // Écran d'attente aux couleurs de l'ambiance choisie (Nuit ou Jour) : plus
    // d'éclair crème avant l'arrivée de l'espace parent, sombre par défaut.
    return (
      <div className="min-h-dvh flex items-center justify-center bg-night-bg" role="status" aria-label="Chargement de ton espace">
        <div className="flex flex-col items-center gap-5 animate-om-fade">
          <BrandLogo className="w-14 h-14" />
          <span className="w-6 h-6 rounded-full border-2 border-line2 border-t-accent animate-spin" aria-hidden />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
