'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4" role="status" aria-label="Chargement">
          <div className="w-10 h-10 border-4 border-navy-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-navy-600/60 text-sm font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
