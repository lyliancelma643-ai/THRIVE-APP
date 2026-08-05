import { describe, expect, it } from 'vitest';
import {
  fromDatetimeLocal,
  isOverdue,
  isUpcoming,
  matchesSearch,
  toDatetimeLocal,
  waitlistToCsv,
  type WaitlistRow,
} from './waitlist';

function row(overrides: Partial<WaitlistRow> = {}): WaitlistRow {
  return {
    id: 'id-1',
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z',
    first_name: 'Camille',
    email: 'camille@exemple.com',
    phone: '514 555-0134',
    source: 'qr',
    consent: true,
    status: 'nouveau',
    pack: 'AVANCE',
    destination: 'Rive-Sud',
    notes: null,
    called_at: null,
    child_first_name: 'Léo',
    child_age: 11,
    age_group: '8-11',
    main_need: 'Confiance en soi',
    call_preference: 'soir',
    appointment_at: null,
    ...overrides,
  };
}

const NOW = Date.parse('2026-08-10T12:00:00.000Z');

describe('agenda des rappels', () => {
  it('ne compte comme « à venir » qu’un rendez-vous fixé et futur', () => {
    expect(isUpcoming(null, NOW)).toBe(false);
    expect(isUpcoming('2026-08-09T12:00:00.000Z', NOW)).toBe(false);
    expect(isUpcoming('2026-08-11T12:00:00.000Z', NOW)).toBe(true);
  });

  it('signale un rendez-vous dépassé tant que le prospect n’est pas traité', () => {
    const past = '2026-08-09T12:00:00.000Z';
    expect(isOverdue(row({ appointment_at: past }), NOW)).toBe(true);
    expect(isOverdue(row({ appointment_at: past, status: 'appelé' }), NOW)).toBe(true);
  });

  it('cesse de relancer une fois le dossier clos', () => {
    const past = '2026-08-09T12:00:00.000Z';
    expect(isOverdue(row({ appointment_at: past, status: 'converti' }), NOW)).toBe(false);
    expect(isOverdue(row({ appointment_at: past, status: 'perdu' }), NOW)).toBe(false);
  });

  it('ne relance jamais un prospect sans rendez-vous', () => {
    expect(isOverdue(row({ appointment_at: null }), NOW)).toBe(false);
  });
});

describe('champ datetime-local', () => {
  it('fait l’aller-retour sans décaler l’heure affichée', () => {
    // Le champ HTML travaille en heure locale, la base en UTC : c'est là que se
    // glissent les rendez-vous décalés de plusieurs heures.
    const local = toDatetimeLocal('2026-08-12T18:30:00.000Z');
    const back = fromDatetimeLocal(local);
    expect(toDatetimeLocal(back)).toBe(local);
    expect(new Date(back!).getTime()).toBe(Date.parse('2026-08-12T18:30:00.000Z'));
  });

  it('traite le champ vidé comme « pas de rendez-vous »', () => {
    expect(fromDatetimeLocal('')).toBeNull();
    expect(toDatetimeLocal(null)).toBe('');
  });

  it('ne renvoie pas de date invalide', () => {
    expect(fromDatetimeLocal('pas-une-date')).toBeNull();
    expect(toDatetimeLocal('pas-une-date')).toBe('');
  });
});

describe('recherche', () => {
  it('cherche aussi dans le prénom de l’enfant et le besoin', () => {
    expect(matchesSearch(row(), 'léo')).toBe(true);
    expect(matchesSearch(row(), 'confiance')).toBe(true);
    expect(matchesSearch(row(), '555-0134')).toBe(true);
    expect(matchesSearch(row(), 'introuvable')).toBe(false);
  });

  it('renvoie tout quand la recherche est vide', () => {
    expect(matchesSearch(row(), '   ')).toBe(true);
  });
});

describe('export CSV', () => {
  it('commence par le BOM UTF-8 (sinon Excel casse les accents)', () => {
    expect(waitlistToCsv([])).toMatch(/^﻿/);
  });

  it('exporte les libellés lisibles plutôt que les clés stockées', () => {
    const csv = waitlistToCsv([row({ status: 'sans réponse' })]);
    expect(csv).toContain('"Avancé"');
    expect(csv).toContain('"Sans réponse"');
    expect(csv).toContain('"QR code"');
    expect(csv).toContain('"En soirée"');
  });

  it('échappe les guillemets et neutralise le séparateur dans les notes', () => {
    const csv = waitlistToCsv([row({ notes: 'Dit : "je rappelle" ; en vacances' })]);
    expect(csv).toContain('"Dit : ""je rappelle"" ; en vacances"');
    // La ligne de données reste une seule ligne CSV malgré le point-virgule.
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('laisse une colonne vide quand l’information manque', () => {
    const csv = waitlistToCsv([row({ child_first_name: null, child_age: null, age_group: null })]);
    expect(csv).toContain(';"";"";"";');
  });
});
