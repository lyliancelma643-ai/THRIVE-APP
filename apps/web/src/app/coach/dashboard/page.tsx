'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePrograms, useSessions } from '@thrive/shared';

export default function CoachDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate } = useAuthStore();
  const { programs, isLoading: programsLoading } = usePrograms({ coachId: user?.id });
  const { sessions } = useSessions();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="p-8">Chargement...</div>;
  if (!user) return null;

  const totalChildren = programs.reduce(
    (acc, p) => acc + (p.program_enrollments?.length ?? 0), 0
  );
  const todaySessions = sessions.filter((s) => {
    if (!s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === new Date().toDateString();
  });

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard Coach 🎯</h1>
        <p className="text-gray-500 mb-8">{user.firstName} {user.lastName}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-bold">{programs.length}</p>
            <p className="text-gray-500 mt-1">Programmes</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-bold">{totalChildren}</p>
            <p className="text-gray-500 mt-1">Enfants suivis</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-bold">{todaySessions.length}</p>
            <p className="text-gray-500 mt-1">Séances aujourd'hui</p>
          </div>
        </div>

        {/* Programmes */}
        <h2 className="text-xl font-bold mb-4">Mes programmes</h2>
        {programsLoading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : programs.length === 0 ? (
          <p className="text-gray-400">Aucun programme créé.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {programs.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Groupe {p.age_group} · {p.program_enrollments?.length ?? 0} enfants · {p.total_sessions} séances
                </p>
                {p.description && (
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">{p.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
