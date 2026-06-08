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
        <h1 className="text-2xl font-bold text-white mb-2">Séances</h1>
        <p className="text-white/70">Planifiez et suivez les séances avec vos jeunes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl border border-[#a7c4bc]/30 text-center">
          <p className="text-[#a7c4bc]">Aucune séance pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-md border border-brand-tertiary/30 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/10 backdrop-blur-md/5 text-[#a7c4bc] font-medium border-b border-[#a7c4bc]/30">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Jeune</th>
                  <th className="px-6 py-4 font-semibold">Séance N°</th>
                  <th className="px-6 py-4 font-semibold">Statut</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#a7c4bc]/10">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-white/10 backdrop-blur-md/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-[#F7F5F2] font-medium">
                      {session.scheduled_at 
                        ? new Date(session.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                        : 'Non planifiée'}
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]">
                      {session.children?.first_name} {session.children?.last_name}
                    </td>
                    <td className="px-6 py-4 text-[#a7c4bc]">
                      Séance {session.session_number} : {session.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        session.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        'bg-white/10 backdrop-blur-md/10 text-[#F7F5F2]'
                      }`}>
                        {session.status === 'COMPLETED' ? 'Terminée' :
                         session.status === 'SCHEDULED' ? 'Planifiée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-semibold text-brand-primary hover:bg-brand-tertiary/10 px-3 py-1.5 rounded-lg transition-colors">
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
