// Portage de apps/web/src/components/parent/p3/session.ts.
// État « de la soirée » (par enfant et par jour, en mémoire comme le sessionStorage du web) : fiches écartées ce
// soir (« Autre activité », « Pas ce soir ») et refus consécutifs. Préférences durables (durée, accueil vu,
// bilan à 4 semaines) dans AsyncStorage. Toute erreur de stockage retombe sur la valeur par défaut.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Duration } from '../../lib/p3web';

const tonight = () => new Date().toDateString();

export type Evening = { day: string; excluded: string[]; refusals: number };

const evenings = new Map<string, Evening>();
const weekDone = new Map<string, number>();

export function readEvening(childId: string): Evening {
  const e = evenings.get(childId);
  return e && e.day === tonight() ? e : { day: tonight(), excluded: [], refusals: 0 };
}

export function excludeTonight(childId: string, activityId: string): Evening {
  const e = readEvening(childId);
  const next = { ...e, excluded: Array.from(new Set([...e.excluded, activityId])) };
  evenings.set(childId, next);
  return next;
}

export function addRefusal(childId: string, activityId: string): Evening {
  const e = readEvening(childId);
  const next = { ...e, refusals: e.refusals + 1, excluded: Array.from(new Set([...e.excluded, activityId])) };
  evenings.set(childId, next);
  return next;
}

/** « Semaine n complète » : posé à la fin d'un moment, lu une fois par l'accueil. */
export function pushWeekDone(childId: string, week: number) {
  weekDone.set(childId, week);
}
export function popWeekDone(childId: string): number | null {
  const v = weekDone.get(childId) ?? null;
  weekDone.delete(childId);
  return v;
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}

export async function readPrefDuration(): Promise<Duration | null> {
  const d = await readJSON<number | null>('thrive.p3.duree', null);
  return d === 10 || d === 20 || d === 30 ? d : null;
}
export function writePrefDuration(d: Duration) {
  writeJSON('thrive.p3.duree', d);
}

export function readFlag(key: string): Promise<boolean> {
  return readJSON<boolean>(key, false);
}
export function writeFlag(key: string, v = true) {
  writeJSON(key, v);
}

export function readLocalJSON<T>(key: string, fallback: T): Promise<T> {
  return readJSON(key, fallback);
}
export function writeLocalJSON(key: string, value: unknown) {
  writeJSON(key, value);
}
