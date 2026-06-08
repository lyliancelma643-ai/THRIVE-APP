import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface Session {
  id: string;
  program_id: string;
  child_id: string;
  session_number: number;
  title: string;
  status: string;
  scheduled_at?: string;
  completed_at?: string;
  coach_notes?: string;
  duration_minutes?: number;
  children?: { first_name: string; last_name: string };
}

export function useSessions(filters?: { programId?: string; childId?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    let query = supabaseClient
      .from('sessions')
      .select('*, children(first_name, last_name)');

    if (filters?.programId) query = query.eq('program_id', filters.programId);
    if (filters?.childId) query = query.eq('child_id', filters.childId);

    const { data, error } = await query.order('session_number');
    if (error) setError(error.message);
    else setSessions(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchSessions(); }, [filters?.programId, filters?.childId]);

  const updateSession = async (sessionId: string, updates: Partial<Session>) => {
    const { data, error } = await supabaseClient
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await fetchSessions();
    return data;
  };

  return { sessions, isLoading, error, refetch: fetchSessions, updateSession };
}
