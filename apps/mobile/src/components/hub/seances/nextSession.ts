import { sessionWhen } from '../../../../../web/src/lib/session-time';

/**
 * Date affichée sur la carte « Prochaine séance ». Une séance planifiée dont la fin est passée sans avoir été
 * validée n'est plus « prochaine » : on n'affiche pas une date révolue, on invite à la reprogrammer.
 */
export type NextSessionDate =
  | { kind: 'upcoming'; label: string }
  | { kind: 'overdue'; label: string }
  | { kind: 'unscheduled'; label: string };

export function nextSessionDate(
  scheduledAt: string | null,
  durationMinutes: number | null,
  live: boolean,
  now: number = Date.now(),
): NextSessionDate {
  if (!scheduledAt) return { kind: 'unscheduled', label: 'Date à fixer avec ton coach' };
  const start = new Date(scheduledAt).getTime();
  if (Number.isNaN(start)) return { kind: 'unscheduled', label: 'Date à fixer avec ton coach' };
  const end = start + (durationMinutes || 60) * 60_000;
  if (!live && end < now) return { kind: 'overdue', label: 'À reprogrammer avec ton coach' };
  return { kind: 'upcoming', label: sessionWhen(scheduledAt) };
}
