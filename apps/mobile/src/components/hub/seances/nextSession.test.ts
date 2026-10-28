import { describe, expect, it } from 'vitest';
import { nextSessionDate } from './nextSession';

const NOW = Date.parse('2026-10-27T16:00:00Z');

describe('nextSessionDate', () => {
  it('sans date : à fixer avec le coach', () => {
    expect(nextSessionDate(null, 60, false, NOW).kind).toBe('unscheduled');
    expect(nextSessionDate('pas une date', 60, false, NOW).kind).toBe('unscheduled');
  });

  it('date passée et séance non commencée : à reprogrammer, jamais la date révolue', () => {
    const r = nextSessionDate('2026-08-24T17:00:00Z', 60, false, NOW);
    expect(r).toEqual({ kind: 'overdue', label: 'À reprogrammer avec ton coach' });
  });

  it('date à venir : la date est affichée', () => {
    const r = nextSessionDate('2026-11-02T17:00:00Z', 60, false, NOW);
    expect(r.kind).toBe('upcoming');
    expect(r.label).not.toMatch(/reprogrammer/);
  });

  it('séance commencée il y a 30 min (durée 60) : encore en cours, pas en retard', () => {
    expect(nextSessionDate('2026-10-27T15:30:00Z', 60, false, NOW).kind).toBe('upcoming');
  });

  it('séance marquée en cours par le coach : jamais « à reprogrammer »', () => {
    expect(nextSessionDate('2026-10-27T10:00:00Z', 60, true, NOW).kind).toBe('upcoming');
  });

  it('durée absente : 60 min par défaut', () => {
    expect(nextSessionDate('2026-10-27T15:01:00Z', null, false, NOW).kind).toBe('upcoming');
    expect(nextSessionDate('2026-10-27T14:59:00Z', null, false, NOW).kind).toBe('overdue');
  });
});
