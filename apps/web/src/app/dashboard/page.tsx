'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, signOut } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    PARENT: 'Parent',
    COACH: 'Coach',
    ADMIN: 'Administrateur',
    SUPER_ADMIN: 'Super Admin',
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-8">
          <h1 className="text-3xl font-bold mb-2">Bienvenue 👋</h1>
          <p className="text-gray-600 mb-6">
            {user.firstName} {user.lastName} — {roleLabel[user.role ?? ''] ?? user.role}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Rôle</p>
              <p className="font-medium">{roleLabel[user.role ?? ''] ?? user.role}</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="bg-black text-white rounded-xl px-6 py-3 font-semibold"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}
