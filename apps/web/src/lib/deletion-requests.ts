// Demandes de suppression de compte — logique pure de la page /admin/suppressions.
// Échéance légale (Loi 25, art. 32) : 30 jours après réception, posée en base
// (migration 067, colonne due_at). Ici : affichage et priorisation seulement.

export const DELETION_DEADLINE_DAYS = 30;

export type DeletionRequestRow = {
  id: string;
  status: 'PENDING' | 'PURGED' | 'CANCELLED' | 'ANONYMIZED';
  target_profile_id: string | null;
  target_email: string | null;
  target_name: string | null;
  reason: string | null;
  requested_at: string;
  due_at?: string | null;
  processed_at: string | null;
  resolution_note: string | null;
  store_subscription: string | null;
  assigned: { first_name: string | null; last_name: string | null; email: string } | null;
};

const DAY = 86_400_000;

/** Échéance effective (repli : réception + 30 jours si la migration 067 manque). */
export function dueDate(row: Pick<DeletionRequestRow, 'requested_at' | 'due_at'>): Date {
  return row.due_at ? new Date(row.due_at) : new Date(new Date(row.requested_at).getTime() + DELETION_DEADLINE_DAYS * DAY);
}

/** Jours restants avant l'échéance, arrondis au jour supérieur ; négatif = en retard. */
export function daysLeft(row: Pick<DeletionRequestRow, 'requested_at' | 'due_at'>, now = new Date()): number {
  return Math.ceil((dueDate(row).getTime() - now.getTime()) / DAY);
}

export type Urgency = 'late' | 'soon' | 'ok';
export function urgency(row: Pick<DeletionRequestRow, 'requested_at' | 'due_at'>, now = new Date()): Urgency {
  const d = daysLeft(row, now);
  return d < 0 ? 'late' : d <= 7 ? 'soon' : 'ok';
}

export function deadlineLabel(row: Pick<DeletionRequestRow, 'requested_at' | 'due_at'>, now = new Date()): string {
  const d = daysLeft(row, now);
  if (d < 0) return `En retard de ${-d} jour${-d > 1 ? 's' : ''}`;
  if (d === 0) return 'Échéance aujourd’hui';
  return `${d} jour${d > 1 ? 's' : ''} restant${d > 1 ? 's' : ''}`;
}

/** Les plus urgentes d'abord. */
export function sortByDeadline<T extends Pick<DeletionRequestRow, 'requested_at' | 'due_at'>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => dueDate(a).getTime() - dueDate(b).getTime());
}

/** Courriel de confirmation à envoyer au parent une fois le compte supprimé. */
export function confirmationMailto(email: string, name: string | null): string {
  const subject = 'Confirmation de la suppression de ton compte THRIVE';
  const body =
    `Bonjour${name ? ` ${name}` : ''},\n\n` +
    'Comme tu l’as demandé, ton compte THRIVE a été supprimé, ainsi que les données de ta famille ' +
    '(profils des enfants, bilans, séances, messages et activités Maison).\n\n' +
    'Les factures liées à un abonnement payé en ligne restent conservées par notre prestataire de paiement, ' +
    'comme l’exige la loi.\n\n' +
    'Merci de nous avoir fait confiance.\n\nL’équipe THRIVE';
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
