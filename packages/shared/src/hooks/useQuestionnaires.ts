import { useEffect, useState, useCallback } from 'react';
import { supabaseClient as supabase } from '../lib/supabase';

export interface Question {
  id: string;
  questionnaire_id: string;
  text: string;
  type: 'scale' | 'multiple_choice' | 'text' | 'yes_no';
  options: string[];
  order_index: number;
}

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  session_id?: string;
  program_id?: string;
  created_by?: string;
  questions?: Question[];
}

export interface QuestionnaireResponse {
  id: string;
  questionnaire_id: string;
  child_id: string;
  session_id?: string;
  answers: Record<string, string | number>;
  score?: number;
  completed_at: string;
}

export function useQuestionnaires(sessionId?: string, programId?: string) {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('questionnaires')
      .select('*, questions(*)')
      .order('created_at', { ascending: false });

    if (sessionId) query = query.eq('session_id', sessionId);
    if (programId) query = query.eq('program_id', programId);

    const { data, error: err } = await query;
    if (err) { setError(err.message); }
    else { setQuestionnaires(data ?? []); }
    setIsLoading(false);
  }, [sessionId, programId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createQuestionnaire = async (
    title: string,
    questions: Omit<Question, 'id' | 'questionnaire_id'>[],
    opts?: { sessionId?: string; programId?: string; description?: string }
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: q, error: qErr } = await supabase
      .from('questionnaires')
      .insert({
        title,
        description: opts?.description,
        session_id: opts?.sessionId,
        program_id: opts?.programId,
        created_by: user?.id,
      })
      .select()
      .single();

    if (qErr || !q) throw new Error(qErr?.message ?? 'Erreur création');

    if (questions.length > 0) {
      await supabase.from('questions').insert(
        questions.map((qs, i) => ({
          ...qs,
          questionnaire_id: q.id,
          order_index: i,
        }))
      );
    }
    await fetch();
    return q;
  };

  const submitResponse = async (
    questionnaireId: string,
    childId: string,
    answers: Record<string, string | number>,
    sessionId?: string
  ) => {
    const total = Object.keys(answers).length;
    const numericValues = Object.values(answers).filter((v) => typeof v === 'number') as number[];
    const score = numericValues.length > 0
      ? Math.round((numericValues.reduce((a, b) => a + b, 0) / (numericValues.length * 10)) * 100)
      : undefined;

    const { data, error: err } = await supabase
      .from('questionnaire_responses')
      .insert({
        questionnaire_id: questionnaireId,
        child_id: childId,
        session_id: sessionId,
        answers,
        score,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (err) throw new Error(err.message);
    return data;
  };

  return { questionnaires, isLoading, error, createQuestionnaire, submitResponse, refetch: fetch };
}
