import { describe, expect, it } from 'vitest';
import { draftKeyFor, parseDraft } from './useSessionDraft';

describe('brouillon de séance — sortie et reprise sans perte', () => {
  it('la clé de stockage est celle d’avant le Mode Terrain', () => {
    expect(draftKeyFor('abc')).toBe('thrive-seance-abc');
  });

  it('un brouillon écrit AVANT le Mode Terrain se relit intégralement', () => {
    const legacy = JSON.stringify({
      checks: { '3-0': true },
      ratings: { '10|Clarté du check-in': 4 },
      fields: { 'Notes libres': 'arrive calme' },
      parentMsg: 'Bonjour,',
      startedAt: 1_700_000_000_000,
    });
    const d = parseDraft(legacy)!;
    expect(d.checks).toEqual({ '3-0': true });
    expect(d.ratings).toEqual({ '10|Clarté du check-in': 4 });
    expect(d.fields).toEqual({ 'Notes libres': 'arrive calme' });
    expect(d.parentMsg).toBe('Bonjour,');
    expect(d.startedAt).toBe(1_700_000_000_000);
    // Champs du Mode Terrain absents : valeurs neutres, aucune perte.
    expect(d.fieldPage).toBe(0);
    expect(d.timers).toEqual({});
  });

  it('la page en cours et les chronos sont restitués tels quels', () => {
    const d = parseDraft(
      JSON.stringify({
        checks: {},
        ratings: {},
        fields: {},
        parentMsg: '',
        fieldPage: 3,
        timers: { 'fm-19': { accumulatedMs: 42_000, runningSince: null } },
      })
    )!;
    expect(d.fieldPage).toBe(3);
    expect(d.timers).toEqual({ 'fm-19': { accumulatedMs: 42_000, runningSince: null } });
  });

  it('un brouillon absent ou illisible ne fait jamais échouer l’écran', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('{pas du json')).toBeNull();
    expect(parseDraft('"chaîne"')).toBeNull();
    expect(parseDraft('null')).toBeNull();
  });

  it('une page enregistrée aberrante retombe sur le premier temps', () => {
    expect(parseDraft(JSON.stringify({ fieldPage: -2 }))!.fieldPage).toBe(0);
    expect(parseDraft(JSON.stringify({ fieldPage: 'x' }))!.fieldPage).toBe(0);
  });
});
