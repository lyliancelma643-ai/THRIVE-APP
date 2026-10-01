import { describe, expect, it } from 'vitest';
import { sessionIcs, sessionTime, sessionWhen } from './session-time';

describe('sessionTime', () => {
  it('donne l’heure locale de Montréal', () => {
    // 21 h 30 UTC = 17 h 30 à Montréal (heure d'été)
    expect(sessionTime('2026-10-06T21:30:00Z')).toBe('17\u00a0h\u00a030');
    expect(sessionTime('2026-10-06T22:00:00Z')).toBe('18\u00a0h');
  });
  it('ne montre pas d’heure pour une séance planifiée à minuit (date seule)', () => {
    expect(sessionTime('2026-10-06T04:00:00Z')).toBeNull();
  });
  it('ignore une date invalide', () => {
    expect(sessionTime('n/a')).toBeNull();
    expect(sessionWhen('n/a')).toBe('');
  });
});

describe('sessionWhen', () => {
  it('assemble le jour et l’heure', () => {
    expect(sessionWhen('2026-10-06T21:30:00Z')).toBe('mardi 6 octobre · 17\u00a0h\u00a030');
  });
});

describe('sessionIcs', () => {
  it('produit un évènement valide', () => {
    const ics = sessionIcs({
      id: 's1',
      title: 'THRIVE · Séance 8, avec Léo',
      start: '2026-10-06T21:30:00Z',
      durationMinutes: 45,
      now: new Date('2026-10-01T12:00:00Z'),
    });
    expect(ics).toContain('DTSTART:20261006T213000Z');
    expect(ics).toContain('DTEND:20261006T221500Z');
    expect(ics).toContain('SUMMARY:THRIVE · Séance 8\\, avec Léo');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
