'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useFamily, useChildren, usePrograms, useSessions } from '@thrive/shared';
import { useMemo } from 'react';

export default function ParentProgramsPage() {
  const { user } = useAuthStore();
  const { family } = useFamily(user?.id);
  const { children, isLoading: childrenLoading } = useChildren(family?.id);
  const { programs, isLoading: programsLoading } = usePrograms();
  const { sessions, isLoading: sessionsLoading } = useSessions();

  const childIds = useMemo(() => children.map(c => c.id), [children]);

  // Les programmes où au moins un enfant est inscrit
  const enrolledPrograms = programs.filter(p => 
    p.program_enrollments?.some(e => childIds.includes(e.child_id))
  );

  // Les autres programmes disponibles
  const availablePrograms = programs.filter(p => 
    !p.program_enrollments?.some(e => childIds.includes(e.child_id))
  );

  const isLoading = childrenLoading || programsLoading || sessionsLoading;

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-10 border-b border-white/20 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Programmes & Séances</h1>
        <p className="text-white/70 text-base">Suivez le parcours de développement de vos enfants</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Programmes en cours */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-brand-tertiary rounded-full"></div>
              <h2 className="text-lg font-bold text-white">Programmes en cours</h2>
            </div>
            
            {enrolledPrograms.length === 0 ? (
              <div className="bg-white/10 rounded-xl p-8 text-center border border-white/20">
                <p className="text-white/80 text-sm">Vos enfants ne sont inscrits à aucun programme pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {enrolledPrograms.map((program) => (
                  <div key={program.id} className="bg-white rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all border-l-4 border-l-brand-primary">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-xl">{program.title}</h3>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary">
                          Groupe {program.age_group}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{program.description}</p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Coach assigné</p>
                        <p className="text-sm font-bold text-gray-900">
                          {program.profiles ? `${program.profiles.first_name} ${program.profiles.last_name}` : 'Non assigné'}
                        </p>
                      </div>

                      {/* Enfants inscrits */}
                      <div className="flex -space-x-2 overflow-hidden mb-4">
                        {program.program_enrollments
                          ?.filter(e => childIds.includes(e.child_id))
                          .map(e => {
                            const child = children.find(c => c.id === e.child_id);
                            if (!child) return null;
                            return (
                              <div key={child.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-brand-tertiary flex items-center justify-center text-white text-xs font-bold" title={`${child.first_name}`}>
                                {child.first_name?.[0] || ''}
                              </div>
                            );
                          })}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <span>{program.total_sessions}</span>
                          <span>Séance(s) au total</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autres programmes */}
          {availablePrograms.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-brand-tertiary/50 rounded-full"></div>
                <h2 className="text-lg font-bold text-white/90">Autres programmes disponibles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availablePrograms.map((program) => (
                  <div key={program.id} className="bg-white/90 rounded-xl p-5 border border-white/20 hover:bg-white transition-colors cursor-pointer">
                    <h3 className="font-bold text-gray-900 text-base mb-1">{program.title}</h3>
                    <p className="text-brand-primary text-xs font-bold mb-3">Pour les {program.age_group}</p>
                    <p className="text-gray-500 text-xs line-clamp-2">{program.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
