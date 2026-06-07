'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    <div className="flex gap-6">
      {/* Liste */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Questionnaires 📝</h1>
            <p className="text-gray-500 mt-1">{questionnaires.length} questionnaire{questionnaires.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : questionnaires.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-500">Aucun questionnaire. Créez-en depuis l’app coach mobile.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questionnaires.map((q) => (
              <div
                key={q.id}
                className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-2 ${
                  selected?.id === q.id ? 'border-black' : 'border-transparent'
                }`}
                onClick={() => setSelected(q)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{q.title}</h3>
                    {q.description && <p className="text-gray-500 text-sm mt-1">{q.description}</p>}
                    <div className="flex gap-3 mt-2 text-sm text-gray-400">
                      <span>{q.questions?.length ?? 0} question{(q.questions?.length ?? 0) > 1 ? 's' : ''}</span>
                      {q.profiles && <span>· Par {q.profiles.first_name} {q.profiles.last_name}</span>}
                      <span>· {new Date(q.created_at).toLocaleDateString('fr-CA')}</span>
                    </div>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détail */}
      {selected && (
        <div className="w-96 bg-white rounded-2xl shadow-sm p-6 h-fit sticky top-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-black">✕</button>
          </div>
          {selected.description && <p className="text-gray-500 text-sm mb-4">{selected.description}</p>}
          <div className="space-y-3">
            {(selected.questions ?? []).sort((a, b) => a.order_index - b.order_index).map((q, i) => (
              <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-400">Q{i + 1}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                    {TYPE_LABELS[q.type] ?? q.type}
                  </span>
                </div>
                <p className="text-sm font-medium">{q.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
