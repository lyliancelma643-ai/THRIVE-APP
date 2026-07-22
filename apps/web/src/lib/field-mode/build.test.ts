import { describe, expect, it } from 'vitest';
import type { SessionScript, ScriptBlock } from '../session-scripts';
import scripts from '../session-scripts.json';
import { buildFieldModeSession, isKeyPhraseLong, unescapeMarkdown } from './build';

const DATA = scripts as unknown as Record<string, Record<string, SessionScript>>;
const AGE_GROUPS = Object.keys(DATA);
const ALL: { age: string; num: string; script: SessionScript }[] = AGE_GROUPS.flatMap((age) =>
  Object.keys(DATA[age]).map((num) => ({ age, num, script: DATA[age][num] }))
);

/** Reconstruit les clés du mode standard depuis la fiche brute. */
function standardKeys(script: SessionScript) {
  const checks = new Set<string>();
  const ratings = new Set<string>();
  const fields = new Set<string>();
  script.blocks.forEach((b, bi) => {
    if (b.t === 'checklist') b.items.forEach((_, ii) => checks.add(`${bi}-${ii}`));
    if (b.t === 'grid') b.items.forEach((ind) => ratings.add(`${bi}|${ind}`));
    if (b.t === 'field') fields.add(b.label);
  });
  return { checks, ratings, fields };
}

function section(title: string, level = 2): ScriptBlock {
  return { t: 'section', title, level };
}

describe('unescapeMarkdown', () => {
  it("retire les échappements résiduels sans toucher au reste", () => {
    expect(unescapeMarkdown('Rappel du transfert (S6 \\+ S7)')).toBe('Rappel du transfert (S6 + S7)');
    expect(unescapeMarkdown('1\\. Retour sur le parcours')).toBe('1. Retour sur le parcours');
    expect(unescapeMarkdown('Sur 10, où t’en es ?')).toBe('Sur 10, où t’en es ?');
  });
});

describe('buildFieldModeSession — les 39 fiches', () => {
  it('couvre 3 tranches d’âge × 13 séances', () => {
    expect(ALL).toHaveLength(39);
  });

  it.each(ALL)('$age S$num produit au moins une page', ({ script }) => {
    expect(buildFieldModeSession(script).pages.length).toBeGreaterThan(0);
  });

  it.each(ALL)('$age S$num : une page par section de niveau 2', ({ script }) => {
    const sections = script.blocks.filter((b) => b.t === 'section' && b.level === 2).length;
    const first = script.blocks.findIndex((b) => b.t === 'section' && b.level === 2);
    // Une fiche peut ouvrir sur un temps dépourvu d'en-tête (8–11 S9) : il
    // constitue alors une page supplémentaire, en tête.
    const intro = script.blocks.slice(0, first < 0 ? script.blocks.length : first).some((b) => b.t !== 'callout');
    expect(buildFieldModeSession(script).pages).toHaveLength(sections + (intro ? 1 : 0));
  });

  it.each(ALL)('$age S$num : aucune clé de saisie ne diverge du mode standard', ({ script }) => {
    const std = standardKeys(script);
    const built = buildFieldModeSession(script);
    for (const page of built.pages) {
      for (const c of page.checklist) expect(std.checks.has(c.key)).toBe(true);
      for (const i of page.indicators) expect(std.ratings.has(i.key)).toBe(true);
      for (const n of page.notes) expect(std.fields.has(n.key)).toBe(true);
    }
  });

  it.each(ALL)('$age S$num : aucune saisie perdue entre les deux modes', ({ script }) => {
    const std = standardKeys(script);
    const built = buildFieldModeSession(script);
    const seen = { checks: new Set<string>(), ratings: new Set<string>(), fields: new Set<string>() };
    for (const page of built.pages) {
      page.checklist.forEach((c) => seen.checks.add(c.key));
      page.indicators.forEach((i) => seen.ratings.add(i.key));
      page.notes.forEach((n) => seen.fields.add(n.key));
    }
    // Les blocs du préambule (avant le premier temps) ne portent jamais de
    // saisie : la couverture doit donc être totale.
    expect(seen.checks.size).toBe(std.checks.size);
    expect(seen.ratings.size).toBe(std.ratings.size);
    expect(seen.fields.size).toBe(std.fields.size);
  });

  it.each(ALL)('$age S$num : chaque page pointe une section réelle', ({ script }) => {
    for (const page of buildFieldModeSession(script).pages) {
      if (page.blockIndex < 0) continue; // page d'ouverture sans en-tête
      expect(script.blocks[page.blockIndex].t).toBe('section');
    }
  });

  it.each(ALL)('$age S$num : les blocs de détail sont ceux de la source', ({ script }) => {
    for (const page of buildFieldModeSession(script).pages) {
      for (const b of page.detail) expect(script.blocks).toContain(b);
    }
  });
});

describe('structure dynamique — aucun cas particulier codé en dur', () => {
  it('S1 (alliance) et S7 (bilan) suivent leur propre découpage', () => {
    for (const age of AGE_GROUPS) {
      for (const num of ['1', '7']) {
        const script = DATA[age][num];
        const pages = buildFieldModeSession(script).pages;
        expect(pages.length).toBeGreaterThan(0);
        expect(pages.length).not.toBe(5); // ces séances ne font pas 5 temps
      }
    }
  });

  it('15–17 S8 à S12 n’ont aucune plage horaire : durée nulle, jamais inventée', () => {
    for (const num of ['8', '9', '10', '11', '12']) {
      const pages = buildFieldModeSession(DATA['15-17'][num]).pages;
      expect(pages.length).toBeGreaterThan(0);
      expect(pages.every((p) => p.timeRange === null)).toBe(true);
      expect(pages.every((p) => p.durationMin === null || p.durationMin > 0)).toBe(true);
    }
  });

  it('une plage horaire donne la durée cible en minutes', () => {
    const built = buildFieldModeSession({
      title: 'T',
      parentTemplate: '',
      blocks: [section('0:05–0:25 — Exercice sportif')],
    });
    expect(built.pages[0].timeRange).toEqual([5, 25]);
    expect(built.pages[0].durationMin).toBe(20);
    expect(built.pages[0].title).toBe('Exercice sportif');
  });

  it('une durée entre parenthèses est lue dans la source', () => {
    const built = buildFieldModeSession({
      title: 'T',
      parentTemplate: '',
      blocks: [section('Étape 1 — Résultat vs Processus (4–5 min)')],
    });
    expect(built.pages[0].durationMin).toBe(5);
  });

  it('une fiche sans section de niveau 2 produit tout de même une page', () => {
    const built = buildFieldModeSession({
      title: 'Fiche plate',
      parentTemplate: '',
      blocks: [{ t: 'text', text: 'Un seul bloc' }],
    });
    expect(built.pages).toHaveLength(1);
    expect(built.pages[0].detail).toHaveLength(1);
    expect(built.pages[0].blockIndex).toBe(-1);
  });

  it('un temps d’ouverture sans en-tête devient une page, saisies comprises', () => {
    const built = buildFieldModeSession({
      title: 'Fiche',
      parentTemplate: '',
      blocks: [
        { t: 'verbatim', text: 'Ta tête est plutôt claire ou encombrée ?' },
        { t: 'field', label: 'Réponse du jeune' },
        { t: 'grid', items: ['Clarté mentale'] },
        section('0:03–0:05 — Rappel de continuité'),
        { t: 'text', text: 'suite' },
      ],
    });
    expect(built.pages).toHaveLength(2);
    expect(built.pages[0].title).toBe('Fiche');
    expect(built.pages[1].title).toBe('Rappel de continuité');
    expect(built.pages[0].notes.map((n) => n.key)).toEqual(['Réponse du jeune']);
    // Clés calquées sur le mode standard : la grille est au bloc 2.
    expect(built.pages[0].indicators[0].key).toBe('2|Clarté mentale');
  });

  it('un en-tête absorbé par le titre de la fiche est récupéré, pas réinventé', () => {
    // Cas réel : 8–11 S9, dont le titre porte l'en-tête du premier temps.
    const built = buildFieldModeSession({
      title: 'Concentration intentionnelle (8–11 ans) — Version complète 0:00–0:03 — Check-in',
      parentTemplate: '',
      blocks: [
        { t: 'verbatim', text: 'Ta tête est plutôt claire ?' },
        section('0:03–0:05 — Rappel de continuité'),
      ],
    });
    expect(built.pages[0].title).toBe('Check-in');
    expect(built.pages[0].timeRange).toEqual([0, 3]);
    expect(built.pages[0].durationMin).toBe(3);
  });

  it("sans en-tête récupérable, le titre de la fiche sert, débarrassé de son habillage", () => {
    const built = buildFieldModeSession({
      title: 'Mes objectifs, mon plan (12–14 ans) — Version complète',
      parentTemplate: '',
      blocks: [{ t: 'verbatim', text: 'Bonjour' }, section('0:03–0:05 — Suite')],
    });
    expect(built.pages[0].title).toBe('Mes objectifs, mon plan');
    expect(built.pages[0].durationMin).toBeNull();
  });
});

describe('phrase-clé — sélection sans réécriture', () => {
  const build = (blocks: ScriptBlock[]) =>
    buildFieldModeSession({ title: 'T', parentTemplate: '', blocks: [section('0:00–0:03 — X'), ...blocks] })
      .pages[0].keyPhrase;

  it('le verbatim l’emporte sur tout le reste', () => {
    const p = build([
      { t: 'text', text: 'But : court' },
      { t: 'verbatim', text: 'Sur 10, où t’en es aujourd’hui ?' },
    ]);
    expect(p).toEqual({ text: 'Sur 10, où t’en es aujourd’hui ?', source: 'verbatim' });
  });

  it('à défaut, le verbatim écrit en 📢 « … »', () => {
    const p = build([{ t: 'text', text: '📢 « Cette semaine, tu t’es senti comment ? »' }]);
    expect(p).toEqual({ text: 'Cette semaine, tu t’es senti comment ?', source: 'megaphone' });
  });

  it('à défaut, la formulation qui porte l’intention', () => {
    const p = build([
      { t: 'text', text: 'Un texte de contexte assez long qui ne dit pas l’intention.' },
      { t: 'text', text: 'But : vérifier l’état du jeune.' },
    ]);
    expect(p).toEqual({ text: 'But : vérifier l’état du jeune.', source: 'intent' });
  });

  it('à défaut, le texte le plus court', () => {
    const p = build([
      { t: 'text', text: 'Une phrase nettement plus longue que l’autre, vraiment.' },
      { t: 'text', text: 'Court.' },
    ]);
    expect(p).toEqual({ text: 'Court.', source: 'shortest' });
  });

  it('une section sans texte n’a pas de phrase-clé', () => {
    expect(build([{ t: 'grid', items: ['Indicateur'] }])).toBeNull();
  });

  it('un texte trop long est signalé pour être replié, jamais tronqué', () => {
    const long = 'a'.repeat(400);
    const p = build([{ t: 'verbatim', text: long }]);
    expect(p!.text).toBe(long); // rien n’est coupé dans la donnée
    expect(isKeyPhraseLong(p)).toBe(true);
  });
});

describe('blocs qui s’adaptent ou disparaissent', () => {
  const page = (blocks: ScriptBlock[]) =>
    buildFieldModeSession({ title: 'T', parentTemplate: '', blocks: [section('0:00–0:03 — X'), ...blocks] }).pages[0];

  it('une section sans checklist ne fabrique aucun item', () => {
    expect(page([{ t: 'grid', items: ['A'] }]).checklist).toEqual([]);
  });

  it('une section sans indicateur ne fabrique aucune notation', () => {
    expect(page([{ t: 'checklist', items: ['A'] }]).indicators).toEqual([]);
  });

  it('une section sans champ ne fabrique aucune note', () => {
    expect(page([{ t: 'checklist', items: ['A'] }]).notes).toEqual([]);
  });

  it('l’ordre d’origine de la checklist est respecté', () => {
    const p = page([{ t: 'checklist', items: ['Un', 'Deux', 'Trois'] }]);
    expect(p.checklist.map((c) => c.label)).toEqual(['Un', 'Deux', 'Trois']);
  });

  it('les items au-delà de 5 restent présents (repliés côté vue, jamais supprimés)', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(page([{ t: 'checklist', items }]).checklist).toHaveLength(7);
  });

  it('la clé d’un indicateur garde le libellé BRUT, le label est nettoyé', () => {
    const p = page([{ t: 'grid', items: ['Lien S6 \\+ S7'] }]);
    expect(p.indicators[0].key).toBe('1|Lien S6 \\+ S7');
    expect(p.indicators[0].label).toBe('Lien S6 + S7');
  });
});

describe('bandeau « Important »', () => {
  it("n'existe pas quand la section n'a pas de règle spéciale", () => {
    const built = buildFieldModeSession({
      title: 'T',
      parentTemplate: '',
      blocks: [section('0:00–0:03 — X'), { t: 'text', text: 'ok' }],
    });
    expect(built.pages[0].important).toEqual([]);
  });

  it('reprend les ⚠️ de la section, verbatim', () => {
    const built = buildFieldModeSession({
      title: 'T',
      parentTemplate: '',
      blocks: [
        section('0:00–0:03 — X'),
        { t: 'callout', icon: '⚠️', text: 'Le coach ne dicte pas l’objectif.' },
        { t: 'callout', icon: '🔑', text: 'Rappel stratégique.' },
      ],
    });
    expect(built.pages[0].important).toEqual(['Le coach ne dicte pas l’objectif.']);
  });

  it('les règles ⚠️ de préambule cadrent la première page uniquement', () => {
    const built = buildFieldModeSession({
      title: 'T',
      parentTemplate: '',
      blocks: [
        { t: 'callout', icon: '🎯', text: 'Life skill cible.' },
        { t: 'callout', icon: '⚠️', text: 'Règles de la séance.' },
        section('0:00–0:03 — A'),
        section('0:03–0:05 — B'),
      ],
    });
    expect(built.pages[0].important).toEqual(['Règles de la séance.']);
    expect(built.pages[1].important).toEqual([]);
    // Le cadrage 🎯 n'est pas perdu : il reste consultable en détail.
    expect(built.pages[0].detail.some((b) => b.t === 'callout' && b.icon === '🎯')).toBe(true);
  });
});
