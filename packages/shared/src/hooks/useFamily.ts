import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface Family {
  id: string;
  name: string;
  parent_id: string;
  city?: string;
  province?: string;
}

export function useFamily(userId?: string) {
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamily = async () => {
    if (!userId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from('families')
      .select('*')
      .eq('parent_id', userId)
      .maybeSingle();
    if (error) setError(error.message);
    else setFamily(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchFamily(); }, [userId]);

  const createFamily = async (name: string, city?: string) => {
    if (!userId) throw new Error('userId requis');
    const { data, error } = await supabaseClient
      .from('families')
      .insert({ name, city, parent_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setFamily(data);
    return data;
  };

  return { family, isLoading, error, refetch: fetchFamily, createFamily };
}
