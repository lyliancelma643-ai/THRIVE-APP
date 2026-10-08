import { describe, expect, it } from 'vitest';
import { DRAFT_SCHEMA_VERSION, draftKeyFor, migrateDraft, parseDraft } from './useSessionDraft';

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

  it('la version de schéma est lue, ou 0 sur un brouillon qui l’ignore', () => {
    expect(parseDraft(JSON.stringify({}))!.v).toBe(0);
    expect(parseDraft(JSON.stringify({ v: 1 }))!.v).toBe(1);
  });
});

describe('migration des clés — décalage de blocs de 8–11 S9', () => {
  // Brouillon antérieur au correctif : l'en-tête « Check-in » n'était pas encore
  // un bloc, donc la grille du check-in était au bloc 12 et sa checklist au 3.
  const legacyS9 = () =>
    parseDraft(
      JSON.stringify({
        checks: { '3-0': true, '6-1': true },
        ratings: { '12|Clarté mentale': 4 },
        fields: { 'Réponse du jeune': 'arrive posé' },
        parentMsg: 'Bonjour,',
      })
    )!;

  it('cible bien la fiche 8–11 S9 : les clés indexées glissent de +1', () => {
    const d = migrateDraft(legacyS9(), { age: '8-11', num: 9 });
    expect(d.checks).toEqual({ '4-0': true, '7-1': true });
    expect(d.ratings).toEqual({ '13|Clarté mentale': 4 });
    // Les champs (indexés par libellé) ne bougent pas.
    expect(d.fields).toEqual({ 'Réponse du jeune': 'arrive posé' });
    // Le reste du brouillon est préservé, et la version est estampillée.
    expect(d.parentMsg).toBe('Bonjour,');
    expect(d.v).toBe(DRAFT_SCHEMA_VERSION);
  });

  it('est idempotente : un brouillon déjà migré ne glisse pas une seconde fois', () => {
    const once = migrateDraft(legacyS9(), { age: '8-11', num: 9 });
    const twice = migrateDraft(once, { age: '8-11', num: 9 });
    expect(twice.checks).toEqual({ '4-0': true, '7-1': true });
    expect(twice.ratings).toEqual({ '13|Clarté mentale': 4 });
  });

  it('ne touche aucune autre fiche : même numéro, autre tranche d’âge', () => {
    const d = migrateDraft(legacyS9(), { age: '12-14', num: 9 });
    expect(d.checks).toEqual({ '3-0': true, '6-1': true });
    expect(d.ratings).toEqual({ '12|Clarté mentale': 4 });
    // Rien à décaler, mais la version est portée pour ne plus reconsidérer.
    expect(d.v).toBe(DRAFT_SCHEMA_VERSION);
  });

  it('ne touche aucune autre fiche : même tranche, autre numéro', () => {
    const d = migrateDraft(legacyS9(), { age: '8-11', num: 8 });
    expect(d.checks).toEqual({ '3-0': true, '6-1': true });
    expect(d.ratings).toEqual({ '12|Clarté mentale': 4 });
  });

  it('un brouillon déjà à la version courante ressort tel quel', () => {
    const current = { ...legacyS9(), v: DRAFT_SCHEMA_VERSION };
    expect(migrateDraft(current, { age: '8-11', num: 9 })).toBe(current);
  });
});
