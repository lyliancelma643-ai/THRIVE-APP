'use client';

import { useAuthStore } from '@/stores/auth.store';
import { usePrograms } from '@thrive/shared';

export default function CoachProgramsPage() {
  const { user } = useAuthStore();
  const { programs, isLoading } = usePrograms({ coachId: user?.id });

  if (!user) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Mes Programmes</h1>
        <p className="text-gray-500">Gérez les programmes d'accompagnement de vos jeunes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
          <p className="text-gray-500">Aucun programme pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <div key={program.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{program.title}</h3>
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
                <div className="text-sm font-medium text-gray-900">
                  {program.total_sessions} séances
                </div>
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Voir détails →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
