import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDeckMarkdown, type HomeCard } from './parse';
import {
  HOME_CARDS,
  DECKS,
  cardsOfSession,
  deckForAge,
  isCardUnlocked,
  isNudgeWindow,
  latestSession,
  momentsPhrase,
  plainText,
  resolveDecks,
  scriptToCopy,
  filterCards,
  suggestNext,
  cardsOfDeck,
} from './index';
import { HARD_NIGHTS, TOP_FIVE } from './guide';

const contentDir = path.resolve(__dirname, '../../content/a-la-maison');
const parsed = (['a', 'b', 'c'] as const).map((d) =>
  parseDeckMarkdown(readFileSync(path.join(contentDir, `paquet-${d}.md`), 'utf8')),
);
const cards: HomeCard[] = parsed.flatMap((p) => p.cards);

// « Le plan des 13 semaines » du fichier maître — référence indépendante du parser
const PLAN: Record<number, [string, string, string]> = {
  1: ['A01 A02 A03', 'B01 B02 B03', 'C01 C02'],
  2: ['A04 A05 A06', 'B04 B05 B06', 'C03 C04 C05'],
  3: ['A07 A08 A09', 'B07 B08 B09', 'C06 C07 C08'],
  4: ['A10 A11 A12', 'B10 B11', 'C09 C10'],
  5: ['A13 A14 A15', 'B12 B13 B14', 'C11 C12 C13'],
  6: ['A16 A17', 'B15 B16', 'C14 C15 C16'],
  7: ['A18 A19', 'B17 B18', 'C17 C18'],
  8: ['A20 A21 A22', 'B19 B20 B21', 'C19 C20'],
  9: ['A23 A24', 'B22 B23 B24', 'C21 C22 C23'],
  10: ['A25 A26', 'B25 B26', 'C24 C25 C26'],
  11: ['A27 A28', 'B27 B28', 'C27 C28 C29'],
  12: ['A29 A30 A31', 'B29 B30 B31', 'C30 C31'],
  13: ['A32 A33 A34', 'B32 B33', 'C32 C33'],
};

describe('contenu — fichier maître', () => {
  it('contient 100 cartes : 34 · 33 · 33', () => {
    expect(cards).toHaveLength(100);
    expect(cards.filter((c) => c.deck === 'A')).toHaveLength(34);
    expect(cards.filter((c) => c.deck === 'B')).toHaveLength(33);
    expect(cards.filter((c) => c.deck === 'C')).toHaveLength(33);
    expect(new Set(cards.map((c) => c.id)).size).toBe(100);
  });

  it('respecte le plan des 13 semaines', () => {
    for (const [session, row] of Object.entries(PLAN)) {
      (['A', 'B', 'C'] as const).forEach((deck, i) => {
        const ids = cards
          .filter((c) => c.deck === deck && c.session === Number(session))
          .map((c) => c.id)
          .join(' ');
        expect(ids, `séance ${session}, paquet ${deck}`).toBe(row[i]);
      });
    }
  });

  it('chaque carte : 1 à 3 étapes, champs remplis, se déverrouille à sa propre séance', () => {
    for (const c of cards) {
      expect(c.steps.length, c.id).toBeGreaterThan(0);
      expect(c.steps.length, c.id).toBeLessThanOrEqual(3);
      for (const f of ['objective', 'session_link', 'what_it_builds', 'script', 'trap', 'success_marker'] as const) {
        expect(c[f].length, `${c.id}.${f}`).toBeGreaterThan(3);
      }
      expect(c.unlock_after_session, c.id).toBe(c.session);
      // Règle §0.8 : le nom du thème n'apparaît jamais seul, il est suivi d'une explication
      expect(c.what_it_builds.replace(/^\*[^*]+\*\.?/, '').trim().length, c.id).toBeGreaterThan(10);
    }
  });

  it('reproduit l’objet d’exemple du brief (B17)', () => {
    expect(cards.find((c) => c.id === 'B17')).toMatchObject({
      deck: 'B',
      age_min: 12,
      age_max: 14,
      session: 7,
      session_label: 'Bilan de mi-parcours',
      pillar_code: 'P7',
      pillar_plain: "L'effort plutôt que le résultat",
      title: 'Le débrief 3 – 1',
      duration_min: 10,
      materials: 'aucun',
      context: 'apres_match',
      energy: 'calme',
      repeatable: true,
      unlock_after_session: 7,
    });
  });

  it('le JSON servi à l’app est synchronisé avec le markdown (sinon : pnpm --filter web cards:build)', () => {
    expect(HOME_CARDS).toEqual(cards);
    expect(Object.values(DECKS)).toEqual(parsed.map((p) => p.info));
  });

  it('les tableaux du guide ne citent que des cartes du bon paquet', () => {
    const ids = new Set(cards.map((c) => c.id));
    for (const deck of ['A', 'B', 'C'] as const) {
      const refs = [...TOP_FIVE[deck], ...HARD_NIGHTS.flatMap((h) => h.cards[deck])];
      for (const id of refs) {
        expect(ids.has(id), id).toBe(true);
        expect(id[0]).toBe(deck);
      }
    }
  });
});

describe('règles — paquet et déverrouillage', () => {
  const now = new Date('2026-09-13T12:00:00Z');

  it('attribue le paquet par âge', () => {
    expect([7, 8, 11, 12, 14, 15, 17, 18].map(deckForAge)).toEqual(['A', 'A', 'A', 'B', 'B', 'C', 'C', 'C']);
  });

  it('fige le paquet à l’âge du début du programme', () => {
    // 12 ans au début (paquet B), 15 ans aujourd'hui
    const r = resolveDecks({
      dateOfBirth: '2011-06-01',
      programStart: new Date('2024-01-10'),
      now,
      unlockedSessions: new Set([1, 2, 3]),
    });
    expect(r).toEqual({ deck: 'B', bonusDeck: null });
  });

  it('débloque le paquet suivant en bonus une fois la séance 13 passée', () => {
    const r = resolveDecks({
      dateOfBirth: '2011-06-01',
      programStart: new Date('2024-01-10'),
      now,
      unlockedSessions: new Set(Array.from({ length: 13 }, (_, i) => i + 1)),
    });
    expect(r).toEqual({ deck: 'B', bonusDeck: 'C' });
    const c01 = HOME_CARDS.find((c) => c.id === 'C01')!;
    expect(isCardUnlocked(c01, new Set(), r.bonusDeck)).toBe(true);
  });

  it('pas de bonus si l’enfant est resté dans sa tranche', () => {
    const r = resolveDecks({
      dateOfBirth: '2016-03-01',
      programStart: null,
      now,
      unlockedSessions: new Set([13]),
    });
    expect(r).toEqual({ deck: 'A', bonusDeck: null });
  });

  it('sans date de naissance, aucun paquet (on n’en devine pas un)', () => {
    expect(resolveDecks({ dateOfBirth: null, programStart: null, now, unlockedSessions: new Set() })).toEqual({
      deck: null,
      bonusDeck: null,
    });
  });

  it('une carte ne s’ouvre jamais avant sa séance', () => {
    const [a07] = cardsOfSession('A', 3);
    expect(isCardUnlocked(a07, new Set([1, 2]))).toBe(false);
    expect(isCardUnlocked(a07, new Set([1, 2, 3]))).toBe(true);
    // Paquet bonus ≠ paquet de la carte : aucune ouverture anticipée
    expect(isCardUnlocked(a07, new Set([1]), 'B')).toBe(false);
  });

  it('retient la séance validée la plus récente', () => {
    const m = new Map([
      [2, '2026-09-01T10:00:00Z'],
      [3, '2026-09-08T10:00:00Z'],
      [1, '2026-08-25T10:00:00Z'],
    ]);
    expect(latestSession(m)).toEqual({ session: 3, at: '2026-09-08T10:00:00Z' });
    expect(latestSession(new Map())).toBeNull();
  });

  it('relance entre 24 et 48 h après la séance, jamais le jour même', () => {
    const h = (n: number) => new Date(now.getTime() - n * 36e5).toISOString();
    expect(isNudgeWindow(h(3), now)).toBe(false);
    expect(isNudgeWindow(h(23.9), now)).toBe(false);
    expect(isNudgeWindow(h(24), now)).toBe(true);
    expect(isNudgeWindow(h(47), now)).toBe(true);
    expect(isNudgeWindow(h(48), now)).toBe(false);
    expect(isNudgeWindow(null, now)).toBe(false);
  });
});

describe('fierté', () => {
  it('une phrase, jamais un score', () => {
    expect(momentsPhrase(0)).toBeNull();
    expect(momentsPhrase(1)).toBe('1 moment avec votre enfant depuis le début du programme.');
    expect(momentsPhrase(7)).toBe('7 moments avec votre enfant depuis le début du programme.');
  });

  it('copie la phrase à dire, sans les indications de mise en scène', () => {
    expect(scriptToCopy('« Regarde cette liste. Qui a fait ça ? » *(la bonne réponse, c’est lui)*')).toBe(
      '« Regarde cette liste. Qui a fait ça ? »',
    );
    expect(scriptToCopy("*(rien avant qu'il demande)* Puis : « T'as demandé. »")).toBe("Puis : « T'as demandé. »");
  });

  it('retire les marqueurs markdown', () => {
    expect(plainText('« Regarde. » *(la bonne réponse, c’est lui)* **fort**')).toBe(
      '« Regarde. » (la bonne réponse, c’est lui) fort',
    );
  });
});

describe('interactions', () => {
  it('filtre « Ce soir, j’ai… » sur les champs de la carte', () => {
    const b = cardsOfDeck('B');
    expect(filterCards(b, 'short').every((c) => c.duration_min <= 10)).toBe(true);
    expect(filterCards(b, 'car').map((c) => c.id)).toEqual(['B02', 'B03', 'B09', 'B11', 'B18', 'B30']);
    expect(filterCards(cardsOfDeck('A'), 'bed').map((c) => c.id)).toEqual(['A14', 'A16', 'A25']);
  });

  it('propose d’abord une carte ouverte de la même séance, jamais la carte en cours', () => {
    const next = suggestNext({ deck: 'B', currentId: 'B17', unlockedSessions: new Set([6, 7]), doneIds: new Set() });
    expect(next?.id).toBe('B18');
  });

  it('sinon la séance ouverte la plus récente, et rien si tout est fait', () => {
    expect(
      suggestNext({ deck: 'B', currentId: 'B17', unlockedSessions: new Set([6, 7]), doneIds: new Set(['B18']) })?.id,
    ).toBe('B15');
    expect(
      suggestNext({ deck: 'A', currentId: 'A01', unlockedSessions: new Set([1]), doneIds: new Set(['A02', 'A03']) }),
    ).toBeNull();
  });
});
