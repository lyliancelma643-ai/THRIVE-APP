import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  avatar_url?: string;
  is_active: boolean;
  child_badges?: { badges: { name: string; icon_url?: string } }[];
}

export function useChildren(familyId?: string) {
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = async () => {
    if (!familyId) { setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabaseClient
      .from('children')
      .select('*, child_badges(badges(name, icon_url))')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('first_name');
    if (error) setError(error.message);
    else setChildren(data ?? []);
    setIsLoading(false);
  };

  useEffect(() => { fetchChildren(); }, [familyId]);

  const createChild = async (dto: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
  }) => {
    if (!familyId) throw new Error('familyId requis');
    const { data, error } = await supabaseClient
      .from('children')
      .insert({ ...dto, family_id: familyId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await fetchChildren();
    return data;
  };

  const deleteChild = async (childId: string) => {
    await supabaseClient.from('children').update({ is_active: false }).eq('id', childId);
    await fetchChildren();
  };

  return { children, isLoading, error, refetch: fetchChildren, createChild, deleteChild };
}
