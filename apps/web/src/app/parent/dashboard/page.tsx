'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useFamily, useChildren, useSessions } from '@thrive/shared';
import Link from 'next/link';

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const { family, isLoading: familyLoading } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const { sessions, isLoading: sessionsLoading } = useSessions(); // Ideally, sessions should be filtered by child id, but we'll show all related sessions for now

  if (!user) return null;

  const todaySessions = sessions.filter((s) => {
    if (!s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === new Date().toDateString();
  });

  const isLoading = familyLoading || childrenLoading || sessionsLoading;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10 border-b border-white/20 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Parent</h1>
        <p className="text-white/70 text-base">Bienvenue, {user.firstName || 'Parent'} {user.lastName || ''} - Famille {family?.name || ''}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Vue Globale */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-brand-tertiary rounded-full"></div>
              <h2 className="text-lg font-bold text-white">Vue d'ensemble</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
                <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Enfants Inscrits</p>
                <p className="text-3xl font-bold text-gray-900">{children.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
                <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Séances aujourd'hui</p>
                <p className="text-3xl font-bold text-gray-900">{todaySessions.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
                <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Messages non lus</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          {/* Enfants */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-brand-tertiary rounded-full"></div>
                <h2 className="text-lg font-bold text-white">Mes Enfants</h2>
              </div>
              <Link href="/parent/children" className="text-sm font-medium text-brand-tertiary hover:text-white transition-colors">
                Voir tout →
              </Link>
            </div>
            
            {children.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-sm mb-4">Vous n'avez pas encore ajouté d'enfant.</p>
                <Link href="/parent/children" className="inline-flex bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-primary/90 transition-colors">
                  Ajouter un enfant
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <div key={child.id} className="bg-white rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-tertiary/20 rounded-full flex items-center justify-center text-brand-primary font-bold text-xl border border-brand-tertiary">
                      {child.first_name?.[0] || ''}{child.last_name?.[0] || ''}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{child.first_name} {child.last_name}</h3>
                      <p className="text-sm text-gray-500">{new Date().getFullYear() - new Date(child.date_of_birth).getFullYear()} ans</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
