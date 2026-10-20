import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_BLOCK_TEXT, IDENTITY_FOOTER, LOCKED_TEXT, blocksFor, buildObjectModel, buildPrintHtml, escapeHtml, fullDate, hasCard,
  letterLine, list, rewardTitle,
} from './logic';

// Fixtures de test uniquement (jamais dans le code de production).
const NAME = 'Prénom-test';
const none = new Set<string>();
const row = (payload: Record<string, unknown> | null, earned_at = '2027-01-13T15:00:00.000Z') => ({ payload, earned_at });

describe('titres des objets (repris du web)', () => {
  it('Fiche Identité, bilan, Boîte à Outils, certificat', () => {
    expect(rewardTitle('fiche_identite', NAME)).toBe(`La Fiche Identité de ${NAME}`);
    expect(rewardTitle('bilan_mi_parcours', NAME)).toBe(`Six semaines avec ${NAME}`);
    expect(rewardTitle('boite_a_outils', NAME)).toBe(`La Boîte à Outils de ${NAME}`);
    expect(rewardTitle('certificat', NAME)).toBe('Certificat THRIVE Maison');
  });
  it('les autres objets prennent le libellé du catalogue, prénom rempli', () => {
    expect(rewardTitle('lettre_un_an', NAME)).toBe('La lettre à ouvrir dans un an');
  });
});

describe('blocs des objets', () => {
  it('Fiche Identité : trois blocs, dans cet ordre', () => {
    const b = blocksFor('fiche_identite', { forces: ['a', 'b', 'c'], choix: ['d'], reve: ['e'] });
    expect(b.map((x) => x.label)).toEqual(['Ses trois forces', 'Ce qu’il choisit quand il choisit', 'Son rêve de l’année, dans ses mots']);
    expect(b[0].lines).toEqual(['a', 'b', 'c']);
  });
  it('payload absent ou vide : blocs présents mais sans ligne (« Rien de noté ici. » à l’écran)', () => {
    for (const p of [null, {}]) {
      const b = blocksFor('fiche_identite', p);
      expect(b).toHaveLength(3);
      expect(b.every((x) => x.lines.length === 0)).toBe(true);
    }
    expect(EMPTY_BLOCK_TEXT).toBe('Rien de noté ici.');
  });
  it('bilan de mi-parcours', () => {
    const b = blocksFor('bilan_mi_parcours', { podium: ['p'], objectif: ['o'], vu_par_le_parent: 'v' });
    expect(b.map((x) => x.label)).toEqual(['Son podium', 'Son objectif, ajusté', 'Ce que tu as vu changer']);
    expect(b[2].lines).toEqual(['v']);
  });
  it('list accepte chaînes, objets { text } et ignore le reste', () => {
    expect(list([{ text: 'x' }, 'y', null, 3, { kind: 'mot' }])).toEqual(['x', 'y']);
    expect(list('seul')).toEqual(['seul']);
    expect(list(undefined)).toEqual([]);
  });
});

describe('N2 · Fiche Identité', () => {
  it('pied « À garder. On y revient en semaine 13. », blocs, ligne « assemblée »', () => {
    const m = buildObjectModel({ id: 'fiche_identite', firstName: NAME, row: row({ forces: ['f'] }), earnedIds: none });
    expect(m.kind).toBe('sheet');
    if (m.kind !== 'sheet') return;
    expect(m.footer).toBe(IDENTITY_FOOTER);
    expect(m.footer).toBe('À garder. On y revient en semaine 13.');
    expect(m.title).toBe(`La Fiche Identité de ${NAME}`);
    expect(m.assembled).toBe('Assemblée depuis le carnet le jour où la semaine 1 s’est complétée. Elle ne change plus.');
  });
  it('objet gagné selon le carnet mais sans ligne p3_rewards : fiche vide, date du dernier moment', () => {
    const m = buildObjectModel({ id: 'bilan_mi_parcours', firstName: NAME, row: null, earnedIds: new Set(['bilan_mi_parcours']), fallbackDate: '2027-03-02T12:00:00.000Z' });
    expect(m.kind).toBe('sheet');
    if (m.kind === 'sheet') {
      expect(m.blocks.every((b) => b.lines.length === 0)).toBe(true);
      expect(m.footer).toBe(fullDate('2027-03-02T12:00:00.000Z'));
    }
  });
});

describe('objet pas encore gagné', () => {
  it('message d’attente + retour Maison, aucune carte', () => {
    const m = buildObjectModel({ id: 'fiche_identite', firstName: NAME, row: null, earnedIds: none });
    expect(m).toEqual({ kind: 'locked', text: 'Cet objet s’assemble au fil du programme, moment après moment.', backLabel: 'Retour à Maison' });
    expect(LOCKED_TEXT).toBe(m.kind === 'locked' ? m.text : '');
    expect(hasCard(m)).toBe(false);
    expect(buildPrintHtml(m)).toBeNull();
  });
  it('identifiant inconnu ou objet non disponible : même message', () => {
    for (const id of ['n_importe_quoi', 'pack_dehors', '']) {
      expect(buildObjectModel({ id, firstName: NAME, row: row({}), earnedIds: new Set([id]) }).kind).toBe('locked');
    }
  });
});

describe('N3 · Boîte à Outils (carte 85 × 55 mm)', () => {
  const outils = ['o1', { kind: 'mot', text: 'o2' }, 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9'];
  it('recto = 3 premiers outils, verso = outils 4 à 8', () => {
    const m = buildObjectModel({ id: 'boite_a_outils', firstName: NAME, row: row({ outils }), earnedIds: none });
    expect(m.kind).toBe('tools');
    if (m.kind !== 'tools') return;
    expect(m.recto).toEqual(['o1', 'o2', 'o3']);
    expect(m.verso).toEqual(['o4', 'o5', 'o6', 'o7', 'o8']);
  });
  it('moins de 4 outils : pas de verso', () => {
    const m = buildObjectModel({ id: 'boite_a_outils', firstName: NAME, row: row({ outils: ['a'] }), earnedIds: none });
    expect(m.kind === 'tools' && m.verso).toEqual([]);
  });
  it('HTML d’impression : deux pages 85 × 55 mm, couleurs de la charte, texte échappé', () => {
    const m = buildObjectModel({ id: 'boite_a_outils', firstName: NAME, row: row({ outils: ['a<b', 'c', 'd', 'e'] }), earnedIds: none });
    const html = buildPrintHtml(m)!;
    expect(html).toContain('size: 85mm 55mm');
    expect(html).toContain('#F7F5F2');
    expect(html).toContain('#022539');
    expect(html).toContain('a&lt;b');
    expect(html).toContain('Et aussi');
    expect(html).toContain('THRIVE MAISON');
  });
});

describe('N4 · Certificat THRIVE Maison', () => {
  const payload = { forces_s1: ['s1a', 's1b'], forces_s13: ['s13a'], a_garder: 'La phrase gardée' };
  it('forces S1 / S13, phrase gardée, date, pied', () => {
    const m = buildObjectModel({ id: 'certificat', firstName: NAME, row: row(payload), earnedIds: none });
    expect(m.kind).toBe('certificate');
    if (m.kind !== 'certificate') return;
    expect(m.title).toBe('Certificat THRIVE Maison');
    expect(m.columns.map((c) => c.label)).toEqual(['Ses forces en semaine 1', 'Ses forces en semaine 13']);
    expect(m.columns[0].lines).toEqual(['s1a', 's1b']);
    expect(m.columns[1].lines).toEqual(['s13a']);
    expect(m.keep).toBe('La phrase gardée');
    expect(m.dateLine).toBe(fullDate('2027-01-13T15:00:00.000Z'));
    expect(m.footer).toBe(`${NAME} a terminé les 13 semaines du programme THRIVE Maison · ${m.dateLine}`);
  });
  it('D7 : aucun « 1 mois offert » ni dans le modèle ni dans l’HTML imprimé', () => {
    const m = buildObjectModel({ id: 'certificat', firstName: NAME, row: row(payload), earnedIds: none });
    expect(JSON.stringify(m)).not.toMatch(/mois offert/i);
    expect(buildPrintHtml(m)).not.toMatch(/mois offert/i);
  });
  it('sans phrase gardée : pas de citation', () => {
    const m = buildObjectModel({ id: 'certificat', firstName: NAME, row: row({ forces_s1: ['x'] }), earnedIds: none });
    expect(m.kind === 'certificate' && m.keep).toBeNull();
  });
});

describe('« La lettre » : dates seulement, jamais le texte', () => {
  it('scellée : « Lettre scellée le … Elle te reviendra le … »', () => {
    const line = letterLine({ sealed_at: '2026-10-13T12:00:00.000Z' }, NAME);
    expect(line).toBe(`Lettre scellée le ${fullDate('2026-10-13T12:00:00.000Z')}. Elle te reviendra le ${fullDate('2027-10-13T12:00:00.000Z')}.`);
  });
  it('sans date : se garde sur papier, dans son enveloppe fermée', () => {
    expect(letterLine({ sealed_at: null }, NAME)).toBe(`La lettre de ${NAME} se garde sur papier, dans son enveloppe fermée.`);
    expect(letterLine(null, NAME)).toBe(`La lettre de ${NAME} se garde sur papier, dans son enveloppe fermée.`);
    expect(letterLine({ sealed_at: 'pas une date' }, NAME)).toBe(`La lettre de ${NAME} se garde sur papier, dans son enveloppe fermée.`);
  });
  it('le texte de la lettre n’apparaît jamais, même s’il traînait dans le payload', () => {
    const secret = 'CONTENU-SECRET-DE-LA-LETTRE';
    const m = buildObjectModel({
      id: 'lettre_un_an',
      firstName: NAME,
      row: row({ sealed_at: '2026-10-13T12:00:00.000Z', body: secret, text: secret, content: secret }),
      earnedIds: none,
    });
    expect(m.kind).toBe('letter');
    expect(JSON.stringify(m)).not.toContain(secret);
    expect(hasCard(m)).toBe(false);
    expect(buildPrintHtml(m)).toBeNull();
  });
});

describe('utilitaires', () => {
  it('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">l'a & b</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;l&#39;a &amp; b&lt;/a&gt;');
  });
  it('fullDate ne renvoie jamais « Invalid Date »', () => {
    expect(fullDate(null)).toBe('');
    expect(fullDate('nope')).toBe('');
  });
});

describe('non-dérive avec le web (RewardView.tsx)', () => {
  const web = readFileSync(resolve(__dirname, '../../../../../web/src/components/parent/p3/RewardView.tsx'), 'utf8');
  it('les libellés du mobile sont ceux du web, mot pour mot', () => {
    const labels = [
      'Ses trois forces', 'Ce qu’il choisit quand il choisit', 'Son rêve de l’année, dans ses mots', 'Son podium', 'Son objectif, ajusté',
      'Ce que tu as vu changer', 'Ses outils, nommés par lui', 'Ses forces en semaine 1', 'Ses forces en semaine 13', 'Rien de noté ici.',
      'À garder. On y revient en semaine 13.', 'Et aussi', 'a terminé les 13 semaines du programme THRIVE Maison', 'Certificat THRIVE Maison',
      'Lettre scellée le', 'Elle te reviendra le', 'se garde sur papier, dans son enveloppe fermée.',
    ];
    for (const l of labels) expect(web, l).toContain(l);
  });
  it('le message d’attente est celui de la page web', () => {
    const page = readFileSync(resolve(__dirname, '../../../../../web/src/app/parent/(hub)/fitness/objets/[rewardId]/page.tsx'), 'utf8');
    expect(page).toContain('Cet objet s&apos;assemble au fil du programme, moment après moment.');
    expect(page).toContain('Retour à Maison');
  });
});
