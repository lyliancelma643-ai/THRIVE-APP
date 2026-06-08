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
  DRAFT: 'bg-white/10 text-[#a7c4bc]',
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

  const updateStatus = async (programId: string, newStatus: string) => {
    await supabase.from('programs').update({ status: newStatus }).eq('id', programId);
    await fetchPrograms();
  };

  const filtered = filterStatus === 'ALL'
    ? programs
    : programs.filter((p) => p.status === filterStatus);

  const FILTER_OPTIONS = ['ALL', 'ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED', 'ARCHIVED'];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Programmes</h1>
          <p className="text-[#a7c4bc] text-sm">{programs.length} programme{programs.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterStatus(opt)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                filterStatus === opt
                  ? 'bg-[#a7c4bc] text-white border-[#a7c4bc]'
                  : 'bg-white/10 backdrop-blur-md border-[#a7c4bc]/30 text-[#a7c4bc] hover:bg-[#a7c4bc]/20'
              }`}
            >
              {opt === 'ALL' ? 'Tous' : STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {isLoading ? (
            <div className="col-span-2 flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[#a7c4bc]/70 col-span-2 text-center py-12 text-sm">Aucun programme trouvé.</p>
          ) : (
            filtered.map((program) => {
              const completedSessions = (program.sessions ?? []).filter((s) => s.status === 'COMPLETED').length;
              const progressPct = program.total_sessions > 0
                ? Math.round((completedSessions / program.total_sessions) * 100)
                : 0;

              return (
                <div key={program.id} className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-[#a7c4bc]/30 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-[#F7F5F2] text-base">{program.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border ${
                      program.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                      program.status === 'ARCHIVED' ? 'bg-red-50 text-red-700 border-red-200' :
                      program.status === 'PAUSED' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      program.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-[#a7c4bc]/20 text-[#a7c4bc] border-[#a7c4bc]/30'
                    }`}>
                      {STATUS_LABELS[program.status] ?? program.status}
                    </span>
                  </div>
                  
                  {program.description && (
                    <p className="text-[#a7c4bc] text-sm mb-4 line-clamp-2">{program.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#a7c4bc] mb-6">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#F7F5F2]">Groupe</span> {program.age_group}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#F7F5F2]">{program.program_enrollments?.length ?? 0}</span> inscrits
                    </div>
                    {program.profiles && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#F7F5F2]">Coach</span> {program.profiles.first_name} {program.profiles.last_name}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-[#a7c4bc] mb-2">
                      <span>Progression</span>
                      <span>{completedSessions}/{program.total_sessions} ({progressPct}%)</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mb-4 overflow-hidden">
                      <div
                        className="bg-[#a7c4bc] h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-[#a7c4bc]/10">
                      {program.status !== 'ACTIVE' && (
                        <button
                          onClick={() => updateStatus(program.id, 'ACTIVE')}
                          className="text-[11px] font-medium text-green-600 hover:text-green-700 transition-colors"
                        >
                          Activer
                        </button>
                      )}
                      {program.status !== 'PAUSED' && program.status !== 'COMPLETED' && (
                        <button
                          onClick={() => updateStatus(program.id, 'PAUSED')}
                          className="text-[11px] font-medium text-yellow-600 hover:text-yellow-700 transition-colors"
                        >
                          Mettre en pause
                        </button>
                      )}
                      {program.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => updateStatus(program.id, 'ARCHIVED')}
                          className="text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors ml-auto"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
