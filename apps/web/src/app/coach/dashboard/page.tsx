'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePrograms, useSessions } from '@thrive/shared';

export default function CoachDashboardPage() {
  const { user } = useAuthStore();
  const { programs, isLoading: programsLoading } = usePrograms({ coachId: user?.id });
  const { sessions } = useSessions();

  if (!user) return null;

  const totalChildren = programs.reduce(
    (acc, p) => acc + (p.program_enrollments?.length ?? 0), 0
  );
  const todaySessions = sessions.filter((s) => {
    if (!s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === new Date().toDateString();
  });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10 border-b border-white/20 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/70 text-base">Bienvenue, {user.firstName || 'Coach'} {user.lastName || ''}</p>
      </div>

      {/* Section: Vue Globale */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-brand-tertiary rounded-full"></div>
          <h2 className="text-lg font-bold text-white">Vue d'ensemble</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
            <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Programmes</p>
            <p className="text-3xl font-bold text-[#F7F5F2]">{programs.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
            <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Enfants suivis</p>
            <p className="text-3xl font-bold text-[#F7F5F2]">{totalChildren}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
            <p className="text-brand-primary/80 text-xs font-semibold mb-2 uppercase tracking-wider">Séances aujourd'hui</p>
            <p className="text-3xl font-bold text-[#F7F5F2]">{todaySessions.length}</p>
          </div>
        </div>
      </div>

      {/* Section: Programmes */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-6 bg-brand-tertiary rounded-full"></div>
          <h2 className="text-lg font-bold text-white">Mes Programmes Actifs</h2>
        </div>
        
        {programsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : programs.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-[#a7c4bc]/30 p-8 text-center">
            <p className="text-[#a7c4bc] text-sm">Vous n'avez pas encore créé de programme.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programs.map((p) => (
              <div key={p.id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-brand-tertiary/30 hover:border-brand-primary hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-[#F7F5F2] text-lg leading-tight">{p.title}</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md/10 text-brand-primary border border-[#a7c4bc]/30 whitespace-nowrap">
                    Groupe {p.age_group}
                  </span>
                </div>
                {p.description && (
                  <p className="text-[#a7c4bc] text-sm mb-4 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs font-medium text-[#a7c4bc]/70 uppercase tracking-wider mt-auto pt-4 border-t border-[#a7c4bc]/10">
                  <div className="flex items-center gap-1">
                    <span>{p.program_enrollments?.length ?? 0}</span>
                    <span>Enfant(s)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{p.total_sessions}</span>
                    <span>Séance(s)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
