import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;        // YYYY-MM-DD
  gender?: string;
  sport?: string;               // sport pratiqué
  notes?: string;               // infos supplémentaires
  avatar_url?: string;
  is_active: boolean;
  child_badges?: { badges: { name: string; icon_url?: string } }[];
}

export interface CreateChildDTO {
  first_name: string;
  last_name: string;
  date_of_birth: string;        // YYYY-MM-DD
  gender?: string;
  sport?: string;
  notes?: string;
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

  /**
   * Crée un enfant lié à la famille du parent connecté.
   * Insère dans `children` : family_id, first_name, last_name,
   * date_of_birth, gender, sport, notes.
   * Visible immédiatement par les coachs et admins via RLS.
   */
  const createChild = async (dto: CreateChildDTO): Promise<Child> => {
    if (!familyId) throw new Error('familyId requis');
    const { data, error } = await supabaseClient
      .from('children')
      .insert({
        family_id:     familyId,
        first_name:    dto.first_name.trim(),
        last_name:     dto.last_name.trim(),
        date_of_birth: dto.date_of_birth,
        gender:        dto.gender ?? null,
        sport:         dto.sport?.trim() ?? null,
        notes:         dto.notes?.trim() ?? null,
        is_active:     true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await fetchChildren(); // rafraîchit la liste locale
    return data as Child;
  };

  const deleteChild = async (childId: string) => {
    await supabaseClient.from('children').update({ is_active: false }).eq('id', childId);
    await fetchChildren();
  };

  return { children, isLoading, error, refetch: fetchChildren, createChild, deleteChild };
}
