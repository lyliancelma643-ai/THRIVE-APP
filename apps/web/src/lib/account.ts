'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Droits du titulaire du compte (Loi 25 / RGPD, règles App Store et Google Play) :
//   • portabilité : export JSON de ses données (edge function export-my-data) ;
//   • droit à l'oubli : demande de suppression (edge function
//     request-account-deletion → table deletion_requests, traitée par l'équipe
//     THRIVE avec admin-delete-user, qui annule aussi l'abonnement web) ;
//   • changement de mot de passe : lien envoyé à sa propre adresse (même flux
//     que « Mot de passe oublié », aucune saisie de l'ancien mot de passe).
// ─────────────────────────────────────────────────────────────────────────────

import { supabaseClient as supabase } from '@thrive/shared';

export type DeletionRequest = { id: string; status: string; requested_at: string };

/** Nom du fichier d'export : thrive-mes-donnees-AAAA-MM-JJ.json (date locale). */
export function exportFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `thrive-mes-donnees-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** Récupère l'export et le propose au téléchargement. */
export async function downloadMyData(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('export-my-data', { body: {} });
  if (error || !data) throw new Error('export_failed');
  const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Laisse au navigateur le temps de lancer le téléchargement.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/** Demande de suppression déjà en attente pour ce compte (lecture RLS : la sienne). */
export async function fetchPendingDeletion(userId: string): Promise<DeletionRequest | null> {
  const { data } = await supabase
    .from('deletion_requests')
    .select('id, status, requested_at')
    .eq('target_profile_id', userId)
    .eq('status', 'PENDING')
    .maybeSingle();
  return (data as DeletionRequest | null) ?? null;
}

export async function requestAccountDeletion(reason: string | null): Promise<DeletionRequest> {
  const { data, error } = await supabase.functions.invoke('request-account-deletion', {
    body: { reason: reason?.trim() || null },
  });
  const req = (data as { request?: DeletionRequest } | null)?.request;
  if (error || !req) throw new Error('deletion_failed');
  return req;
}

/** Envoie à l'adresse du compte un lien pour choisir un nouveau mot de passe. */
export async function sendPasswordChangeLink(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}
