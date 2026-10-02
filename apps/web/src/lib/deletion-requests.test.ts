import { describe, expect, it } from 'vitest';
import { confirmationMailto, daysLeft, deadlineLabel, dueDate, sortByDeadline, urgency } from './deletion-requests';

const now = new Date('2026-10-02T12:00:00Z');
const req = (requested_at: string, due_at: string | null = null) => ({ requested_at, due_at });

describe('demandes de suppression — échéance 30 jours', () => {
  it('repli : réception + 30 jours sans due_at', () => {
    expect(dueDate(req('2026-10-01T12:00:00Z')).toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });
  it('jours restants et urgence', () => {
    expect(daysLeft(req('2026-10-01T12:00:00Z'), now)).toBe(29);
    expect(urgency(req('2026-10-01T12:00:00Z'), now)).toBe('ok');
    expect(urgency(req('2026-09-08T12:00:00Z'), now)).toBe('soon');
    expect(urgency(req('2026-08-01T12:00:00Z'), now)).toBe('late');
  });
  it('libellés', () => {
    expect(deadlineLabel(req('2026-10-01T12:00:00Z'), now)).toBe('29 jours restants');
    expect(deadlineLabel(req('x', '2026-10-02T12:00:00Z'), now)).toBe('Échéance aujourd’hui');
    expect(deadlineLabel(req('x', '2026-09-30T12:00:00Z'), now)).toBe('En retard de 2 jours');
  });
  it('tri par échéance', () => {
    const rows = [req('2026-10-01T00:00:00Z'), req('2026-09-01T00:00:00Z')];
    expect(sortByDeadline(rows)[0].requested_at).toBe('2026-09-01T00:00:00Z');
  });
  it('courriel de confirmation', () => {
    const m = confirmationMailto('a+b@x.ca', 'Paule');
    expect(m.startsWith('mailto:a%2Bb%40x.ca?subject=')).toBe(true);
    expect(decodeURIComponent(m)).toContain('Bonjour Paule');
  });
});
