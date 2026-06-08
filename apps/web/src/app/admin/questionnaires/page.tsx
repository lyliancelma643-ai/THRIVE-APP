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
    scale: '📊 Échelle',
    yes_no: '✅ Oui/Non',
    multiple_choice: '📝 Choix multiple',
    text: '✍️ Texte',
  };

  return (
    <div className="max-w-7xl mx-auto flex gap-8 relative">
      {/* Liste */}
      <div className={`transition-all duration-500 ease-in-out ${selected ? 'w-2/3' : 'w-full'}`}>
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Questionnaires 📝</h1>
            <p className="text-slate-500 font-medium">{questionnaires.length} questionnaire{questionnaires.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : questionnaires.length === 0 ? (
          <div className="bg-white rounded-[24px] p-16 text-center shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📝</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun questionnaire</h3>
            <p className="text-slate-500">Créez-en un depuis l’application coach mobile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {questionnaires.map((q) => (
              <div
                key={q.id}
                className={`group bg-white rounded-[20px] p-6 cursor-pointer transition-all duration-300 border-2 relative overflow-hidden ${
                  selected?.id === q.id 
                    ? 'border-blue-500 shadow-md shadow-blue-500/10' 
                    : 'border-transparent shadow-sm border-slate-100 hover:border-blue-200 hover:shadow-md'
                }`}
                onClick={() => setSelected(q)}
              >
                {selected?.id === q.id && (
                  <div className="absolute inset-0 bg-blue-50/50" />
                )}
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold text-xl mb-1 ${selected?.id === q.id ? 'text-blue-900' : 'text-slate-900'}`}>
                      {q.title}
                    </h3>
                    {q.description && (
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
                        <span>📋</span> {q.questions?.length ?? 0} question{(q.questions?.length ?? 0) > 1 ? 's' : ''}
                      </div>
                      {q.profiles && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] text-slate-600">
                            {q.profiles.first_name[0]}
                          </div>
                          <span>{q.profiles.first_name} {q.profiles.last_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span>🕒</span>
                        {new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    selected?.id === q.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détail Glassmorphic */}
      {selected && (
        <div className="w-1/3 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-slate-200/50 border border-white p-8 sticky top-8 h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/30 mb-4">
                  📝
                </div>
                <button 
                  onClick={() => setSelected(null)} 
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{selected.title}</h2>
              {selected.description && (
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">{selected.description}</p>
              )}
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Questions ({selected.questions?.length ?? 0})</h3>
                {(selected.questions ?? []).sort((a, b) => a.order_index - b.order_index).map((q, i) => (
                  <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <span className="text-xs font-bold text-slate-400">Q{i + 1}</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-50 text-slate-500 rounded-md px-2 py-1 border border-slate-100">
                        {TYPE_LABELS[q.type] ?? q.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 pl-2 leading-relaxed">{q.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
