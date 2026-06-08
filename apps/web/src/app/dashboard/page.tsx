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
    const role = user?.role?.toUpperCase();
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        router.replace('/admin');
        break;
      case 'COACH':
        router.replace('/coach/dashboard');
        break;
      case 'PARENT':
        router.replace('/parent/dashboard');
        break;
      default:
        // Au cas où, reste sur /dashboard
        break;
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Redirection...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-8">
          <h1 className="text-3xl font-bold mb-2">Bienvenue 👋</h1>
          <p className="text-gray-600 mb-6">
            {user.firstName} {user.lastName} — {user.role}
          </p>
          <p className="text-gray-400 text-sm">Espace parent — tableau de bord en construction.</p>
        </div>
      </div>
    </main>
  );
}
