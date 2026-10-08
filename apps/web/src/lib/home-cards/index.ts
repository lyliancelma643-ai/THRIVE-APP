// ─────────────────────────────────────────────────────────────────────────────
// Module « À la maison » — règles métier (brief §0.5 à §0.7), sans I/O.
//
//   • Paquet : un seul paramètre, l'âge. On le fige à l'âge du DÉBUT du
//     programme : un enfant qui change de tranche termine dans son paquet de
//     départ, le suivant se débloque en bonus une fois la séance 13 passée.
//   • Déverrouillage : une carte s'ouvre quand SA séance a eu lieu, jamais
//     avant, et le reste à vie. La carte joker est ouverte dès l'inscription.
//   • Fierté : une phrase, jamais un score ni une série.
// ─────────────────────────────────────────────────────────────────────────────

import generated from './cards.generated.json';
import type { Deck, DeckInfo, HomeCard } from './parse';

export type { Deck, DeckInfo, HomeCard } from './parse';

const DATA = generated as unknown as { decks: Record<Deck, DeckInfo>; cards: HomeCard[] };

export const JOKER_ID = 'joker';
export const HOME_CARDS: HomeCard[] = DATA.cards;
export const DECKS: Record<Deck, DeckInfo> = DATA.decks;
export const SESSION_COUNT = 13;

const DECK_ORDER: Deck[] = ['A', 'B', 'C'];

export function getCard(id: string): HomeCard | null {
  return HOME_CARDS.find((c) => c.id === id.toUpperCase()) ?? null;
}

export function cardsOfDeck(deck: Deck): HomeCard[] {
  return HOME_CARDS.filter((c) => c.deck === deck);
}

export function cardsOfSession(deck: Deck, session: number): HomeCard[] {
  return HOME_CARDS.filter((c) => c.deck === deck && c.session === session);
}

/** Libellé de séance tel qu'écrit dans le paquet (les paquets diffèrent parfois). */
export function sessionLabel(deck: Deck, session: number): string {
  return cardsOfSession(deck, session)[0]?.session_label ?? `Séance ${session}`;
}

export function ageAt(dateOfBirth: string, at: Date): number {
  const birth = new Date(dateOfBirth);
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age--;
  return age;
}

/** 8–11 → A · 12–14 → B · 15–17 → C (bornes ouvertes : < 8 → A, > 17 → C). */
export function deckForAge(age: number): Deck {
  if (age <= 11) return 'A';
  if (age <= 14) return 'B';
  return 'C';
}

export function resolveDecks(input: {
  dateOfBirth: string | null;
  programStart: Date | null;
  now: Date;
  unlockedSessions: ReadonlySet<number>;
}): { deck: Deck | null; bonusDeck: Deck | null } {
  if (!input.dateOfBirth) return { deck: null, bonusDeck: null };
  const deck = deckForAge(ageAt(input.dateOfBirth, input.programStart ?? input.now));
  const current = deckForAge(ageAt(input.dateOfBirth, input.now));
  const finished = input.unlockedSessions.has(SESSION_COUNT);
  const bonusDeck =
    finished && DECK_ORDER.indexOf(current) > DECK_ORDER.indexOf(deck)
      ? DECK_ORDER[DECK_ORDER.indexOf(deck) + 1]
      : null;
  return { deck, bonusDeck };
}

/**
 * Une carte est ouverte si sa séance a eu lieu. Les cartes du paquet bonus
 * sont toutes ouvertes (le programme est terminé quand il apparaît).
 */
export function isCardUnlocked(
  card: HomeCard,
  unlockedSessions: ReadonlySet<number>,
  bonusDeck: Deck | null = null,
): boolean {
  if (bonusDeck && card.deck === bonusDeck) return true;
  return unlockedSessions.has(card.unlock_after_session);
}

/** Séance validée la plus récente (celle dont les cartes sont « de la semaine »). */
export function latestSession(
  completions: ReadonlyMap<number, string>,
): { session: number; at: string } | null {
  let best: { session: number; at: string } | null = null;
  for (const [session, at] of completions) {
    if (!best || at > best.at || (at === best.at && session > best.session)) best = { session, at };
  }
  return best;
}

/**
 * Relance douce : 24 à 48 h après la séance, jamais le jour même (brief §0.5).
 * Côté app, c'est un encart ; la notification push hebdomadaire reste à brancher.
 */
export function isNudgeWindow(completedAt: string | null, now: Date): boolean {
  if (!completedAt) return false;
  const hours = (now.getTime() - new Date(completedAt).getTime()) / 36e5;
  return hours >= 24 && hours < 48;
}

export const NUDGE_TEXT = '10 minutes ce soir pour prolonger la séance d’hier.';

/** Compteur de fierté : une phrase, pas un score (brief §0.7). */
export function momentsPhrase(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? '1 moment avec votre enfant depuis le début du programme.'
    : `${count} moments avec votre enfant depuis le début du programme.`;
}

export const PRIDE_YES = 'Vous venez de faire quelque chose que la plupart des parents ne font jamais.';
export const PRIDE_NOT_REALLY = 'Normal. Celle-là marche souvent mieux au deuxième essai.';

// ── « Ce soir, j'ai… » — filtres rapides sur les cartes ouvertes ──────────────
export type QuickFilter = 'short' | 'nothing' | 'car' | 'bed' | 'move' | 'calm';

export const QUICK_FILTERS: { id: QuickFilter; label: string; test: (c: HomeCard) => boolean }[] = [
  { id: 'short', label: '10 minutes ou moins', test: (c) => c.duration_min <= 10 },
  { id: 'nothing', label: 'Rien sous la main', test: (c) => c.materials === 'aucun' },
  { id: 'car', label: 'En voiture', test: (c) => c.context === 'voiture' },
  { id: 'bed', label: 'Avant le coucher', test: (c) => c.context === 'coucher' },
  { id: 'move', label: 'Il a besoin de bouger', test: (c) => c.energy === 'actif' },
  { id: 'calm', label: 'Un moment calme', test: (c) => c.energy === 'calme' },
];

export function filterCards(cards: HomeCard[], filter: QuickFilter): HomeCard[] {
  const f = QUICK_FILTERS.find((q) => q.id === filter);
  return f ? cards.filter(f.test) : cards;
}

/**
 * Carte à proposer ensuite : d'abord une autre carte ouverte de la même séance
 * pas encore faite, sinon la plus récente séance ouverte. Jamais la carte en cours.
 */
export function suggestNext(input: {
  deck: Deck;
  currentId: string;
  unlockedSessions: ReadonlySet<number>;
  doneIds: ReadonlySet<string>;
}): HomeCard | null {
  const current = getCard(input.currentId);
  const open = cardsOfDeck(input.deck).filter(
    (c) => input.unlockedSessions.has(c.session) && c.id !== input.currentId,
  );
  const fresh = open.filter((c) => !input.doneIds.has(c.id));
  const sameSession = fresh.find((c) => c.session === current?.session);
  if (sameSession) return sameSession;
  const byRecency = [...fresh].sort((a, b) => b.session - a.session);
  return byRecency[0] ?? null;
}

/**
 * Phrase à copier : sans les indications de mise en scène entre parenthèses
 * (« *(rien avant qu'il demande)* ») ni les marqueurs markdown.
 */
export function scriptToCopy(script: string): string {
  return plainText(script.replace(/\*\([^)]*\)\*/g, '')).replace(/\s+/g, ' ').trim();
}

/** Retire les marqueurs markdown. */
export function plainText(md: string): string {
  return md.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
}
