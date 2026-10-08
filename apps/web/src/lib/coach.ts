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

// ─── Clôture de séance + envoi du bilan (migration 071) ───────────────────────

export type CloseSessionPayload = {
  message: string;
  observations?: Record<string, number>;
  fields?: Record<string, string>;
  age_group?: string | null;
  life_skill_target?: string | null;
  performance_summary?: string | null;
  success_count?: number | null;
};

export type CloseSessionResult = {
  session_id: string;
  child_id: string;
  report_id: string;
  coach_report_id: string;
  status: 'COMPLETED';
  resent: boolean;
};

type RpcError = { code?: string; message?: string } | null | undefined;

// Erreurs levées par complete_session_with_report (SQLSTATE P0001) → français, tutoiement.
const CLOSE_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Ta session a expiré. Reconnecte-toi pour envoyer le bilan.',
  forbidden: "Tu n'as pas le droit de clore cette séance. Seul le coach assigné ou un administrateur peut l'envoyer.",
  session_not_found: "Cette séance n'existe plus. Retourne à la liste des séances.",
  session_cancelled: 'Cette séance est annulée : elle ne peut plus recevoir de bilan.',
  message_required: "Écris un message pour le parent avant d'envoyer le bilan.",
};

export const CLOSE_SESSION_FALLBACK_MESSAGE =
  "Le bilan n'a pas pu être envoyé. Vérifie ta connexion et réessaie : le renvoi ne crée pas de doublon.";

/** Vrai si la RPC n'est pas encore déployée (migration 071 non appliquée). */
export function isCloseRpcMissing(err: RpcError): boolean {
  if (!err) return false;
  if (err.code === 'PGRST202') return true;
  return /could not find the function.*complete_session_with_report/i.test(err.message ?? '');
}

/** Message français affichable pour une erreur de clôture. Rien n'est écrit si la RPC échoue. */
export function closeSessionErrorMessage(err: RpcError): string {
  const raw = (err?.message ?? '').trim();
  return CLOSE_ERROR_MESSAGES[raw] ?? CLOSE_SESSION_FALLBACK_MESSAGE;
}

/**
 * Clôture la séance et envoie le bilan en une seule transaction côté base.
 * Retourne { missing: true } si la RPC n'est pas encore en base, pour que l'appelant
 * bascule sur le repli documenté.
 */
export async function completeSessionWithReport(
  sessionId: string,
  payload: CloseSessionPayload
): Promise<{ result: CloseSessionResult } | { missing: true }> {
  const { data, error } = await supabase.rpc('complete_session_with_report', {
    p_session: sessionId,
    p_payload: payload,
  });
  if (error) {
    if (isCloseRpcMissing(error)) return { missing: true };
    throw new Error(closeSessionErrorMessage(error));
  }
  return { result: data as CloseSessionResult };
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
