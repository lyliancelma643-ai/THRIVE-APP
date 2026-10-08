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
  /**
   * Version de schéma du brouillon. Absente sur les brouillons antérieurs à la
   * première migration (traités comme la version 0). Estampillée à chaque
   * sauvegarde : c'est elle qui empêche une migration de s'appliquer deux fois.
   */
  v?: number;
};

const AUTOSAVE_MS = 600;

/** Version de schéma courante des brouillons. Toute écriture la porte. */
export const DRAFT_SCHEMA_VERSION = 1;

/**
 * Insertions de blocs faites après coup dans certaines fiches : elles décalent
 * l'indexation des blocs, donc les clés de saisie indexées par bloc (`checks` =
 * `${bloc}-${item}`, `ratings` = `${bloc}|${libellé}`). Chaque entrée est
 * estampillée par la version de schéma qui l'a introduite : un brouillon d'une
 * version antérieure la subit une seule fois. Les `fields` (indexés par
 * libellé) ne sont jamais touchés.
 */
type BlockShift = {
  /** Version de schéma qui introduit ce décalage. */
  sinceVersion: number;
  age: string;
  num: string;
  /** Premier index de bloc décalé. */
  at: number;
  /** Nombre de blocs insérés à `at`. */
  by: number;
};

const BLOCK_SHIFTS: BlockShift[] = [
  // 8–11 S9 : l'en-tête « 0:00–0:03 — Check-in » du premier temps, jadis
  // absorbé par le titre de la fiche, a été réinséré en tête de `blocks`. Tous
  // les blocs glissent donc de +1.
  { sinceVersion: 1, age: '8-11', num: '9', at: 0, by: 1 },
];

/** Décale l'index de bloc d'une clé `${bloc}${sep}${reste}`, si `bloc >= at`. */
function shiftKey(key: string, sep: string, at: number, by: number): string {
  const i = key.indexOf(sep);
  if (i < 0) return key;
  const bi = Number(key.slice(0, i));
  if (!Number.isInteger(bi) || bi < at) return key;
  return `${bi + by}${key.slice(i)}`;
}

function remapKeys<T>(rec: Record<string, T>, sep: string, at: number, by: number): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, val] of Object.entries(rec)) out[shiftKey(k, sep, at, by)] = val;
  return out;
}

export function draftKeyFor(sessionId: string | undefined): string {
  return `thrive-seance-${sessionId}`;
}

/**
 * Applique à un brouillon les décalages de blocs qu'il n'a pas encore subis,
 * d'après sa version de schéma et la fiche à laquelle il appartient, puis
 * l'estampille à la version courante. Idempotent : un brouillon déjà à jour
 * (ou d'une autre fiche) ressort inchangé, jamais décalé deux fois.
 */
export function migrateDraft(
  draft: DraftState,
  fiche: { age: string | null; num: number | null }
): DraftState {
  const from = draft.v ?? 0;
  if (from >= DRAFT_SCHEMA_VERSION) return draft;
  let checks = draft.checks;
  let ratings = draft.ratings;
  for (const shift of BLOCK_SHIFTS) {
    if (shift.sinceVersion <= from) continue; // déjà appliqué
    if (shift.age !== fiche.age || shift.num !== String(fiche.num)) continue;
    checks = remapKeys(checks, '-', shift.at, shift.by);
    ratings = remapKeys(ratings, '|', shift.at, shift.by);
  }
  return { ...draft, checks, ratings, v: DRAFT_SCHEMA_VERSION };
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
    // Absente = brouillon antérieur à toute migration : version 0.
    v: typeof o.v === 'number' ? o.v : 0,
  };
}

export function useSessionDraft({
  sessionId,
  ready,
  defaultParentMsg,
  ageGroup,
  sessionNumber,
}: {
  sessionId: string | undefined;
  /** Le brouillon n'est restauré qu'une fois la fiche et l'athlète chargés. */
  ready: boolean;
  defaultParentMsg: () => string;
  /** Tranche d'âge de la fiche — pour cibler une éventuelle migration de clés. */
  ageGroup: string | null;
  /** Numéro de séance de la fiche — idem. */
  sessionNumber: number | null;
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
      const parsed = parseDraft(localStorage.getItem(draftKey));
      // Un brouillon d'une fiche ré-indexée (8–11 S9) voit ses clés de saisie
      // recalées avant restauration ; la version stampée bloque tout second
      // décalage. `fields` (indexés par libellé) restent tels quels.
      const d = parsed ? migrateDraft(parsed, { age: ageGroup, num: sessionNumber }) : null;
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
  }, [ready, draftKey, defaultParentMsg, ageGroup, sessionNumber]);

  // Sauvegarde automatique — rien ne se perd, même hors réseau.
  useEffect(() => {
    if (!restored) return;
    // Toute écriture porte la version courante : une migration déjà passée ne
    // se rejoue jamais à la relecture suivante.
    const d: DraftState = { checks, ratings, fields, parentMsg, startedAt, fieldPage, timers, v: DRAFT_SCHEMA_VERSION };
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
