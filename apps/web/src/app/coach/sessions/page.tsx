'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useSessions } from '@thrive/shared';
import { useMemo } from 'react';

export default function CoachSessionsPage() {
  const { user } = useAuthStore();
  // On récupère toutes les sessions.
  // Idéalement, il faudrait filtrer par coachId via l'API, 
  // mais la table sessions a un program_id et la table programs a un coach_id.
  const { sessions, isLoading } = useSessions();

  if (!user) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Séances</h1>
        <p className="text-gray-500">Planifiez et suivez les séances avec vos jeunes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
          <p className="text-gray-500">Aucune séance pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Jeune</th>
                  <th className="px-6 py-4 font-semibold">Séance N°</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                      {session.scheduled_at 
                        ? new Date(session.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                        : 'Non planifiée'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {session.children?.first_name} {session.children?.last_name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      Séance {session.session_number} : {session.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status === 'COMPLETED' ? 'Terminée' :
                         session.status === 'SCHEDULED' ? 'Planifiée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
