'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Program {
  id: string;
  title: string;
  description?: string;
  age_group: string;
  status: string;
  total_sessions: number;
  created_at: string;
  profiles: { first_name: string; last_name: string };
  program_enrollments: { id: string }[];
  sessions: { id: string; status: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  DRAFT: 'Brouillon',
  COMPLETED: 'Terminé',
  PAUSED: 'En pause',
  ARCHIVED: 'Archivé',
};

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from('programs')
      .select('*, profiles(first_name, last_name), program_enrollments(id), sessions(id, status)')
      .order('created_at', { ascending: false });
    setPrograms(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPrograms(); }, []);

  // Realtime : créations/changements de statut visibles instantanément
  useEffect(() => {
    const channel = supabase
      .channel('admin-programs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, () => fetchPrograms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'program_enrollments' }, () => fetchPrograms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (programId: string, newStatus: string) => {
    await supabase.from('programs').update({ status: newStatus }).eq('id', programId);
    await fetchPrograms();
  };

  const filtered = filterStatus === 'ALL'
    ? programs
    : programs.filter((p) => p.status === filterStatus);

  const FILTER_OPTIONS = ['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Programmes 🏆</h1>
          <p className="text-gray-500 mt-1">{programs.length} programme{programs.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterStatus(opt)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filterStatus === opt
                  ? 'bg-black text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt === 'ALL' ? 'Tous' : STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {isLoading ? (
          <p className="text-gray-400 col-span-2">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 col-span-2">Aucun programme trouvé.</p>
        ) : (
          filtered.map((program) => {
            const completedSessions = (program.sessions ?? []).filter((s) => s.status === 'COMPLETED').length;
            const progressPct = program.total_sessions > 0
              ? Math.round((completedSessions / program.total_sessions) * 100)
              : 0;

            return (
              <div key={program.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg flex-1">{program.title}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ml-2 ${STATUS_STYLES[program.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[program.status] ?? program.status}
                  </span>
                </div>
                {program.description && (
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{program.description}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>Groupe {program.age_group}</span>
                  <span>· {program.program_enrollments?.length ?? 0} inscrits</span>
                  <span>· Coach : {program.profiles?.first_name} {program.profiles?.last_name}</span>
                </div>

                {/* Barre de progression séances */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progression</span>
                    <span>{completedSessions}/{program.total_sessions} séances ({progressPct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-black h-2 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Actions changement statut */}
                <div className="flex gap-2 flex-wrap">
                  {program.status !== 'ACTIVE' && (
                    <button
                      onClick={() => updateStatus(program.id, 'ACTIVE')}
                      className="text-xs bg-green-50 text-green-700 rounded-lg px-3 py-1.5 hover:bg-green-100"
                    >
                      Activer
                    </button>
                  )}
                  {program.status !== 'PAUSED' && program.status !== 'COMPLETED' && (
                    <button
                      onClick={() => updateStatus(program.id, 'PAUSED')}
                      className="text-xs bg-yellow-50 text-yellow-700 rounded-lg px-3 py-1.5 hover:bg-yellow-100"
                    >
                      Mettre en pause
                    </button>
                  )}
                  {program.status !== 'ARCHIVED' && (
                    <button
                      onClick={() => updateStatus(program.id, 'ARCHIVED')}
                      className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-100"
                    >
                      Archiver
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
