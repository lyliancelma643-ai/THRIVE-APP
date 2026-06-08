'use client';

import { useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';

interface Question {
  id: string;
  text: string;
  type: string;
  order_index: number;
}

interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  questions: Question[];
  profiles?: { first_name: string; last_name: string };
}

export default function AdminQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Questionnaire | null>(null);

  useEffect(() => {
    supabase
      .from('questionnaires')
      .select('*, questions(*), profiles(first_name, last_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuestionnaires(data ?? []);
        setIsLoading(false);
      });
  }, []);

  const TYPE_LABELS: Record<string, string> = {
    scale: 'Échelle',
    yes_no: 'Oui/Non',
    multiple_choice: 'Choix multiple',
    text: 'Texte',
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-[#F7F5F2] mb-1">Questionnaires</h1>
        <p className="text-[#a7c4bc] text-sm">{questionnaires.length} questionnaire{questionnaires.length > 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-6 min-h-0 flex-1">
        {/* Liste */}
        <div className={`flex flex-col transition-all duration-300 ${selected ? 'w-1/2' : 'w-full'}`}>
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#a7c4bc]/10 bg-white/10 backdrop-blur-md/5">
              <h2 className="text-sm font-semibold text-[#F7F5F2]">Tous les questionnaires</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : questionnaires.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#a7c4bc]/70 text-sm">Aucun questionnaire. Créez-en un depuis l'application coach.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#a7c4bc]/10">
                  {questionnaires.map((q) => (
                    <div
                      key={q.id}
                      className={`p-6 cursor-pointer transition-colors ${
                        selected?.id === q.id 
                          ? 'bg-[#a7c4bc]/20' 
                          : 'bg-white/10 backdrop-blur-md hover:bg-white/10 backdrop-blur-md/5'
                      }`}
                      onClick={() => setSelected(q)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-[#F7F5F2]">{q.title}</h3>
                        <span className="text-xs text-[#a7c4bc]">
                          {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {q.description && (
                        <p className="text-[#a7c4bc] text-sm mb-4 line-clamp-2">
                          {q.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[#a7c4bc]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[#F7F5F2]">{q.questions?.length ?? 0}</span> questions
                        </div>
                        {q.profiles && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-300">•</span>
                            <span>{q.profiles.first_name} {q.profiles.last_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détail */}
        {selected && (
          <div className="w-1/2 flex flex-col bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="px-6 py-4 border-b border-[#a7c4bc]/10 bg-white/10 backdrop-blur-md flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-[#F7F5F2] mb-1">{selected.title}</h2>
                <p className="text-xs text-[#a7c4bc]">Créé le {new Date(selected.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <button 
                onClick={() => setSelected(null)} 
                className="text-[#a7c4bc]/70 hover:text-[#a7c4bc] transition-colors p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#a7c4bc]/20/30">
              {selected.description && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-[#a7c4bc] uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-[#F7F5F2] text-sm leading-relaxed">{selected.description}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-xs font-semibold text-[#a7c4bc] uppercase tracking-wider mb-4">
                  Questions ({selected.questions?.length ?? 0})
                </h3>
                <div className="space-y-3">
                  {(selected.questions ?? []).sort((a, b) => a.order_index - b.order_index).map((q, i) => (
                    <div key={q.id} className="bg-white/10 backdrop-blur-md border border-[#a7c4bc]/30 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-[#a7c4bc]/70">Question {i + 1}</span>
                        <span className="text-[10px] font-medium bg-white/10 backdrop-blur-md/10 text-[#a7c4bc] px-2 py-0.5 rounded">
                          {TYPE_LABELS[q.type] ?? q.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[#F7F5F2]">{q.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
