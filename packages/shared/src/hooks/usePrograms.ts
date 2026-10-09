import { useCallback, useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface Program {
  id: string;
  title: string;
  description?: string;
  age_group: string;
  status: string;
  total_sessions: number;
  coach_id: string;
  profiles?: { first_name: string; last_name: string };
  program_enrollments?: { child_id: string }[];
}

export function usePrograms(filters?: { coachId?: string; ageGroup?: string; status?: string }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabaseClient
        .from('programs')
        .select('*, profiles(first_name, last_name), program_enrollments(child_id)');

      if (filters?.coachId) query = query.eq('coach_id', filters.coachId);
      if (filters?.ageGroup) query = query.eq('age_group', filters.ageGroup);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) setError(error.message);
      else {
        setPrograms(data ?? []);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, [filters?.coachId, filters?.ageGroup, filters?.status]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return { programs, isLoading, error, refetch: fetchPrograms };
}
