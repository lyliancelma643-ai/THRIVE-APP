// État « de la soirée » (sessionStorage, par enfant et par jour) : fiches
// écartées ce soir (« Autre activité », « Pas ce soir ») et refus consécutifs
// de l'enfant. Préférences durables (durée, lieu) en localStorage.
// Toute lecture/écriture est protégée : navigation privée ou stockage bloqué
// → valeurs par défaut, jamais d'erreur visible.

import type { Duration } from '@/lib/p3-moments';

const tonight = () => new Date().toDateString();

function readJSON<T>(store: 'local' | 'session', key: string, fallback: T): T {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage;
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(store: 'local' | 'session', key: string, value: unknown) {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage;
    s.setItem(key, JSON.stringify(value));
  } catch {
    // ignoré
  }
}

type Evening = { day: string; excluded: string[]; refusals: number };

const eveningKey = (childId: string) => `thrive.p3.evening.${childId}`;

export function readEvening(childId: string): Evening {
  const e = readJSON<Evening | null>('session', eveningKey(childId), null);
  return e && e.day === tonight() ? e : { day: tonight(), excluded: [], refusals: 0 };
}

export function excludeTonight(childId: string, activityId: string): Evening {
  const e = readEvening(childId);
  const next = { ...e, excluded: Array.from(new Set([...e.excluded, activityId])) };
  writeJSON('session', eveningKey(childId), next);
  return next;
}

export function addRefusal(childId: string, activityId: string): Evening {
  const e = readEvening(childId);
  const next = { ...e, refusals: e.refusals + 1, excluded: Array.from(new Set([...e.excluded, activityId])) };
  writeJSON('session', eveningKey(childId), next);
  return next;
}

export function readPrefDuration(): Duration | null {
  const d = readJSON<number | null>('local', 'thrive.p3.duree', null);
  return d === 10 || d === 20 || d === 30 ? d : null;
}
export function writePrefDuration(d: Duration) {
  writeJSON('local', 'thrive.p3.duree', d);
}

export function readFlag(key: string): boolean {
  return readJSON<boolean>('local', key, false);
}
export function writeFlag(key: string, v = true) {
  writeJSON('local', key, v);
}

/** « Semaine n complète » : posé par la synthèse, lu une fois par l'accueil. */
export function pushWeekDone(childId: string, week: number) {
  writeJSON('session', `thrive.p3.weekDone.${childId}`, week);
}
export function popWeekDone(childId: string): number | null {
  const v = readJSON<number | null>('session', `thrive.p3.weekDone.${childId}`, null);
  if (v !== null) {
    try {
      window.sessionStorage.removeItem(`thrive.p3.weekDone.${childId}`);
    } catch {
      // ignoré
    }
  }
  return v;
}

export function readLocalJSON<T>(key: string, fallback: T): T {
  return readJSON('local', key, fallback);
}
export function writeLocalJSON(key: string, value: unknown) {
  writeJSON('local', key, value);
}
