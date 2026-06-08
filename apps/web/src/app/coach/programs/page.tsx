'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { usePrograms } from '@thrive/shared';

const AGE_GROUPS = ['Tous', '8-11 ans', '12-14 ans', '15-17 ans'];

export default function CoachProgramsPage() {
  const { user } = useAuthStore();
  const { programs, isLoading } = usePrograms({ coachId: user?.id });
  const [selectedGroup, setSelectedGroup] = useState('Tous');

  if (!user) return null;

  const filteredPrograms = selectedGroup === 'Tous'
    ? programs
    : programs.filter(p => p.age_group === selectedGroup);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Mes Programmes</h1>
        <p className="text-white/70">Gérez les programmes d'accompagnement de vos jeunes.</p>
      </div>

      {/* Filtres par tranche d'âge */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
        {AGE_GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedGroup === group
                ? 'bg-brand-tertiary text-white shadow-md'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
          <p className="text-gray-500">Aucun programme pour cette tranche d'âge.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <div key={program.id} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-tertiary/30 hover:border-brand-primary flex flex-col h-full hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{program.title}</h3>
                  <p className="text-sm text-gray-500">Tranche d'âge : {program.age_group}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                  program.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {program.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-3">
                {program.description || 'Aucune description fournie.'}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <div className="text-sm font-medium text-brand-primary">
                  {program.total_sessions} séances
                </div>
                <button className="text-sm font-semibold text-brand-primary hover:bg-brand-tertiary/10 px-3 py-1.5 rounded-lg transition-colors">
                  Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
