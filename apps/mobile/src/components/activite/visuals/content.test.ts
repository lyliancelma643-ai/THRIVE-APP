import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { P3_ACTIVITIES } from '../../../lib/p3';
import { VISUAL_IDS } from '../../../../../web/src/lib/p3-moments/parse';
import {
  CARTE, COLONNES, EMOTIONS, ENDROITS_ITEMS, ESCALIER_STEPS, SENS_ITEMS, THERMO, TOOLS, VISUAL_BUTTON_SUB, VISUAL_HINTS, VISUAL_LABELS,
  notesFromMoments, toggleSelection, toolAskLine, toolWordsLine,
} from './content';
import { CHECKIN_FACE_IDS, EXTRA_FACE_IDS, LIST_ICON, TOOL_ICON, VISUAL_ICON } from './iconMap';

const HERE = __dirname;
const WEB_VISUALS = readFileSync(join(HERE, '../../../../../web/src/components/parent/p3/Visuals.tsx'), 'utf8');

describe('sélection : une seule case à la fois, re-toucher la retire', () => {
  it('met une case en avant, puis la remplace par une autre (jamais deux)', () => {
    let sel: string | null = null;
    sel = toggleSelection(sel, 'joie');
    expect(sel).toBe('joie');
    sel = toggleSelection(sel, 'peur');
    expect(sel).toBe('peur');
  });

  it('retire la case quand on la touche de nouveau', () => {
    const on = toggleSelection<number>(null, 6);
    expect(on).toBe(6);
    expect(toggleSelection(on, 6)).toBeNull();
  });
});

describe('« Dans ses mots » : lu depuis les fiches notées', () => {
  const ballon = TOOLS.find((t) => t.id === 'ballon')!;
  const forces = TOOLS.find((t) => t.id === 'forces')!;

  it('est absent quand rien n’a été noté', () => {
    expect(notesFromMoments([])).toEqual({});
    expect(toolWordsLine(ballon, {})).toBeNull();
    expect(toolWordsLine(forces, notesFromMoments([{ activity_id: 'ACT-0101', created_at: '2026-01-01T00:00:00Z', kept_phrase: '  ', capture: null }]))).toBeNull();
  });

  it('lit la phrase notée sur l’une des fiches `from` de l’outil', () => {
    const notes = notesFromMoments([{ activity_id: ballon.from[0], created_at: '2026-01-01T00:00:00Z', kept_phrase: 'Je respire par le ventre.', capture: null }]);
    expect(toolWordsLine(ballon, notes)).toBe('Dans ses mots\u00a0: «\u00a0Je respire par le ventre.\u00a0»');
    // un outil dont aucune fiche n’est notée reste sans « Dans ses mots »
    expect(toolWordsLine(forces, notes)).toBeNull();
  });

  it('préfère la capture (liste jointe), puis la phrase gardée ; la plus récente d’abord', () => {
    const notes = notesFromMoments([
      { activity_id: 'ACT-0101', created_at: '2026-01-01T00:00:00Z', kept_phrase: 'ancienne', capture: { items: ['Patient', ' ', 'Drôle'] } },
      { activity_id: 'ACT-0101', created_at: '2026-02-01T00:00:00Z', kept_phrase: 'récente', capture: null },
      { activity_id: 'ACT-0201', created_at: '2026-01-01T00:00:00Z', kept_phrase: 'x', capture: { text: ' un texte libre ' } },
    ]);
    expect(notes['ACT-0101']).toBe('récente');
    expect(notes['ACT-0201']).toBe('un texte libre');
  });

  it('s’appuie sur des fiches qui existent dans le programme (aucun identifiant en dur orphelin)', () => {
    const ids = new Set(P3_ACTIVITIES.map((a) => a.id));
    for (const t of TOOLS) for (const f of t.from) expect(ids.has(f), `${t.name} → ${f}`).toBe(true);
  });
});

describe('« Demande » affiché à l’outil touché', () => {
  it('formule la question à partir du `ask` de l’outil touché', () => {
    const ballon = TOOLS.find((t) => t.id === 'ballon')!;
    expect(toolAskLine(ballon.ask)).toBe('Demande\u00a0: «\u00a0Ton ballon, tu pourrais t’en servir où\u00a0?\u00a0»');
    for (const t of TOOLS) expect(toolAskLine(t.ask)).toBe(`Demande\u00a0: «\u00a0${t.ask}, tu pourrais t’en servir où\u00a0?\u00a0»`);
  });
});

describe('textes : mot pour mot comme le web', () => {
  it.each(Object.entries(VISUAL_LABELS))('libellé « %s »', (_id, label) => expect(WEB_VISUALS).toContain(`'${label}'`));
  it.each(Object.entries(VISUAL_HINTS))('consigne « %s »', (_id, hint) => expect(WEB_VISUALS).toContain(`'${hint}'`));

  it('couvre les huit visuels de la fiche (VISUAL_IDS)', () => {
    expect(Object.keys(VISUAL_LABELS).sort()).toEqual([...VISUAL_IDS].sort());
    expect(Object.keys(VISUAL_HINTS).sort()).toEqual([...VISUAL_IDS].sort());
    expect(Object.keys(VISUAL_ICON).sort()).toEqual([...VISUAL_IDS].sort());
  });

  it('outils, émotions et contenus statiques identiques au web', () => {
    expect(TOOLS).toHaveLength(11);
    for (const t of TOOLS) {
      expect(WEB_VISUALS).toContain(`name: '${t.name}'`);
      expect(WEB_VISUALS).toContain(`ask: '${t.ask}'`);
      expect(WEB_VISUALS).toContain(`what: '${t.what}'`);
      expect(WEB_VISUALS).toContain(`week: ${t.week}`);
      expect(WEB_VISUALS).toContain(`from: [${t.from.map((f) => `'${f}'`).join(', ')}]`);
    }
    for (const e of EMOTIONS) expect(WEB_VISUALS).toContain(`{ id: '${e.id}', label: '${e.label}'`);
    for (const s of [...SENS_ITEMS, ...ENDROITS_ITEMS]) {
      expect(WEB_VISUALS).toContain(`title: '${s.title}'`);
      expect(WEB_VISUALS).toContain(`sub: '${s.sub}'`);
    }
    for (const t of [...COLONNES.mine.items, ...COLONNES.notMine.items, COLONNES.mine.title, COLONNES.notMine.title, ...ESCALIER_STEPS, ...CARTE.around]) {
      expect(WEB_VISUALS).toContain(t);
    }
    expect(WEB_VISUALS).toContain(COLONNES.example);
    expect(WEB_VISUALS).toContain(VISUAL_BUTTON_SUB);
    expect(WEB_VISUALS).toContain(THERMO.calm);
    expect(WEB_VISUALS).toContain(THERMO.over);
    expect(WEB_VISUALS).toContain('Revenir à l’activité');
    // Les deux phrases dynamiques : mêmes espaces insécables que le web.
    expect(WEB_VISUALS).toContain('Dans ses mots\u00a0: «\u00a0{his}\u00a0»');
    expect(WEB_VISUALS).toContain('Demande\u00a0: «\u00a0{t.ask}, tu pourrais t’en servir où\u00a0?\u00a0»');
  });
});

describe('pictogrammes dessinés, jamais d’emoji', () => {
  it('chaque outil, chaque ligne et chaque émotion a un pictogramme', () => {
    for (const t of TOOLS) expect(TOOL_ICON[t.id], t.id).toBeTruthy();
    for (const i of [...SENS_ITEMS, ...ENDROITS_ITEMS]) expect(LIST_ICON[i.id], i.id).toBeTruthy();
    const faces: readonly string[] = [...EXTRA_FACE_IDS, ...CHECKIN_FACE_IDS];
    for (const e of EMOTIONS) expect(faces).toContain(e.id);
  });

  it('aucun fichier du dossier visuals ni la route ne contient d’emoji, ni de donnée de démo', () => {
    const files = readdirSync(HERE).filter((f) => /\.(tsx?|ts)$/.test(f) && !f.endsWith('.test.ts'));
    const sources = files.map((f) => [f, readFileSync(join(HERE, f), 'utf8')] as const);
    for (const [f, src] of sources) {
      expect(/\p{Extended_Pictographic}/u.test(src), `emoji dans ${f}`).toBe(false);
      expect(/\b(Léo|Camille|Tremblay|Noah|cabane impossible)\b/.test(src), `donnée de démo dans ${f}`).toBe(false);
    }
  });
});
