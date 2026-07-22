'use client';

// Brouillon de séance — source unique des saisies du coach.
//
// Extrait tel quel de l'écran de séance : même clé de stockage, même debounce,
// même forme de données. Le Mode Terrain et le mode standard consomment ce
// hook, si bien qu'ils partagent un seul état et un seul envoi. Les champs
// ajoutés (`fieldPage`, `timers`) sont optionnels : les brouillons déjà
// enregistrés restent lisibles.
import { useCallback, useEffect, useRef, useState } from 'react';

export type SectionTimer = {
  /** Temps déjà écoulé, hors période en cours. */
  accumulatedMs: number;
  /** Horodatage de reprise, ou `null` si le chrono est en pause. */
  runningSince: number | null;
};

export type DraftState = {
  checks: Record<string, boolean>;
  ratings: Record<string, number>;
  fields: Record<string, string>;
  parentMsg: string;
  startedAt?: number | null;
  /** Page courante du Mode Terrain — permet de reprendre au bon temps. */
  fieldPage?: number;
  /** Chronomètres de section, indexés par identifiant de page. */
  timers?: Record<string, SectionTimer>;
};

const AUTOSAVE_MS = 600;

export function draftKeyFor(sessionId: string | undefined): string {
  return `thrive-seance-${sessionId}`;
}

/**
 * Lit un brouillon enregistré. Pur et tolérant : un brouillon écrit avant le
 * Mode Terrain (sans `fieldPage` ni `timers`) doit se relire sans perdre une
 * seule saisie, et un brouillon corrompu ne doit jamais faire échouer l'écran.
 */
export function parseDraft(raw: string | null): DraftState | null {
  if (!raw) return null;
  let d: unknown;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!d || typeof d !== 'object') return null;
  const o = d as Partial<DraftState>;
  return {
    checks: o.checks ?? {},
    ratings: o.ratings ?? {},
    fields: o.fields ?? {},
    parentMsg: typeof o.parentMsg === 'string' ? o.parentMsg : '',
    startedAt: o.startedAt ?? null,
    fieldPage: typeof o.fieldPage === 'number' && o.fieldPage >= 0 ? o.fieldPage : 0,
    timers: o.timers ?? {},
  };
}

export function useSessionDraft({
  sessionId,
  ready,
  defaultParentMsg,
}: {
  sessionId: string | undefined;
  /** Le brouillon n'est restauré qu'une fois la fiche et l'athlète chargés. */
  ready: boolean;
  defaultParentMsg: () => string;
}) {
  const draftKey = draftKeyFor(sessionId);

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [parentMsg, setParentMsg] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [fieldPage, setFieldPage] = useState(0);
  const [timers, setTimers] = useState<Record<string, SectionTimer>>({});
  const [restored, setRestored] = useState(false);
  const restoredRef = useRef(false);

  // Restauration — une seule fois, dès que la fiche est disponible.
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const d = parseDraft(localStorage.getItem(draftKey));
      if (d) {
        setChecks(d.checks);
        setRatings(d.ratings);
        setFields(d.fields);
        setStartedAt(d.startedAt ?? null);
        setFieldPage(d.fieldPage ?? 0);
        setTimers(d.timers ?? {});
        setParentMsg(d.parentMsg || defaultParentMsg());
        setRestored(true);
        return;
      }
    } catch {
      /* brouillon illisible : on repart du modèle */
    }
    setParentMsg(defaultParentMsg());
    setRestored(true);
  }, [ready, draftKey, defaultParentMsg]);

  // Sauvegarde automatique — rien ne se perd, même hors réseau.
  useEffect(() => {
    if (!restored) return;
    const d: DraftState = { checks, ratings, fields, parentMsg, startedAt, fieldPage, timers };
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(d));
      } catch {
        /* stockage plein : tant pis pour le brouillon */
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timeout);
  }, [checks, ratings, fields, parentMsg, startedAt, fieldPage, timers, draftKey, restored]);

  const toggleCheck = useCallback((key: string) => {
    setChecks((c) => ({ ...c, [key]: !c[key] }));
  }, []);

  /** Un second appui sur la même note l'annule — identique au mode standard. */
  const rate = useCallback((key: string, value: number) => {
    setRatings((r) => ({ ...r, [key]: r[key] === value ? 0 : value }));
  }, []);

  const setField = useCallback((key: string, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* rien à nettoyer */
    }
  }, [draftKey]);

  return {
    checks, setChecks, toggleCheck,
    ratings, setRatings, rate,
    fields, setFields, setField,
    parentMsg, setParentMsg,
    startedAt, setStartedAt,
    fieldPage, setFieldPage,
    timers, setTimers,
    restored,
    draftKey,
    clear,
  };
}
