// Types et helpers de l'espace coach
import { supabaseClient as supabase } from '@thrive/shared';

export type AssignedChild = {
  id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  sport: string | null;
  family_id: string;
};

export type CoachSession = {
  id: string;
  program_id: string;
  child_id: string;
  session_number: number | null;
  title: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | 'POSTPONED';
  scheduled_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
};

// Les 13 séances du protocole THRIVE (titres officiels de la méthode)
export const THRIVE_SESSIONS: { num: number; title: string }[] = [
  { num: 1, title: 'Diagnostic de départ / alliance' },
  { num: 2, title: 'Mes objectifs, mon plan' },
  { num: 3, title: 'Confiance et courage' },
  { num: 4, title: "Identifier l'émotion pendant l'action" },
  { num: 5, title: 'Agir : stratégies de recentrage' },
  { num: 6, title: 'Relaxation sous pression' },
  { num: 7, title: 'Bilan mi-parcours' },
  { num: 8, title: "Demander de l'aide" },
  { num: 9, title: 'Concentration : le focus word' },
  { num: 10, title: 'Imagerie mentale' },
  { num: 11, title: 'Ma boîte à outils complète' },
  { num: 12, title: 'Leadership et impact' },
  { num: 13, title: 'Bilan final / célébration' },
];

export async function fetchAssignedChildren(coachId: string): Promise<AssignedChild[]> {
  const { data: assignments } = await supabase
    .from('coach_assignments')
    .select('child_id')
    .eq('coach_id', coachId)
    .eq('is_active', true);

  const childIds = (assignments ?? []).map((a) => a.child_id);
  if (childIds.length === 0) return [];

  const { data: children } = await supabase
    .from('children')
    .select('id, first_name, last_name, date_of_birth, sport, family_id')
    .in('id', childIds)
    .order('first_name');

  return (children ?? []) as AssignedChild[];
}

export function childAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
