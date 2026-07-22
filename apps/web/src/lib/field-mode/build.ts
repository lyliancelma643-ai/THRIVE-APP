// Couche de transformation du Mode Terrain — PURE.
//
// Règles absolues :
//   1. Le contenu source n'est jamais modifié, réécrit ni raccourci. On
//      sélectionne, on ordonne, on replie — jamais on ne reformule.
//   2. Les clés de saisie produites ici sont identiques à celles du mode
//      standard (`page.tsx`), pour que les deux vues partagent le brouillon.
//   3. Rien n'est inventé : une section sans checklist ou sans indicateur
//      produit un tableau vide, jamais un placeholder.
import type { ScriptBlock, SessionScript } from '../session-scripts';
import { parseTimeRange } from '../session-scripts';
import type {
  FieldModeCheckItem,
  FieldModeIndicator,
  FieldModeKeyPhrase,
  FieldModeNote,
  FieldModePage,
  FieldModeSession,
} from './types';

/** Items de checklist affichés d'emblée ; le reste part dans la feuille détail. */
export const MAX_VISIBLE_CHECKS = 5;

/** Au-delà, la phrase-clé est jugée trop longue pour tenir en 2 lignes. */
const KEY_PHRASE_MAX = 160;

/** Amorces qui signalent, dans la source, l'intention de la section. */
const INTENT_PREFIX = /^(But|Objectif|Intention|Cible|Ce que ça travaille)\s*:/i;

/** Verbatim écrit en bloc `text` : `📢 « … »`. */
const MEGAPHONE = /📢\s*[«"]\s*([\s\S]+?)\s*[»"]/;

/** `0:05–0:25 — Titre` → `Titre`. */
const TIME_PREFIX = /^\d+:\d+\s*[–-]\s*\d+:\d+\s*[—–-]\s*/;

/** `Étape 1 — Machin (4–5 min)` → 5 (borne haute, la plus prudente). */
const PAREN_MINUTES = /\((\d+)(?:\s*[–-]\s*(\d+))?\s*min\)/i;

/**
 * Certaines fiches ont vu l'en-tête de leur premier temps absorbé par le titre
 * de la séance (8–11 S9 : `… — Version complète 0:00–0:03 — Check-in`). On le
 * récupère tel quel plutôt que d'inventer un intitulé.
 */
const TRAILING_TIME_HEADER = /(\d+:\d+\s*[–-]\s*\d+:\d+\s*[—–-]\s*\S.*)$/;

/** `Titre (8–11 ans) — Version complète` → `Titre`. */
const TITLE_CHROME = /\s*\(\d+\s*[–-]\s*\d+\s*ans\)\s*(?:[—–-]\s*Version compl[èe]te)?\s*$/i;

/** Intitulé d'un temps d'ouverture dépourvu d'en-tête propre. */
function openingTitle(scriptTitle: string): string {
  const header = scriptTitle.match(TRAILING_TIME_HEADER);
  if (header) return header[1].trim();
  return scriptTitle.replace(TITLE_CHROME, '').trim() || scriptTitle;
}

/**
 * Retire les échappements markdown résiduels du contenu source
 * (`(S6 \+ S7)`, `1\. Retour…`). Purement cosmétique : le JSON source reste
 * intact, et le mode standard n'est pas affecté.
 */
export function unescapeMarkdown(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, '$1');
}

/** Bloc → texte affichable, ou `null` si le bloc ne porte pas de texte. */
function blockText(block: ScriptBlock): string | null {
  switch (block.t) {
    case 'verbatim':
    case 'text':
    case 'callout':
      return block.text;
    default:
      return null;
  }
}

/**
 * Sélectionne la phrase-clé de la section, dans l'ordre de priorité imposé par
 * la méthode : un verbatim destiné au coach l'emporte toujours ; à défaut, la
 * formulation la plus courte qui porte l'intention. Aucune réécriture.
 */
function pickKeyPhrase(blocks: ScriptBlock[]): FieldModeKeyPhrase | null {
  // 1. Bloc `verbatim` — la phrase que le coach prononce.
  const verbatim = blocks.find((b) => b.t === 'verbatim');
  if (verbatim && verbatim.t === 'verbatim') {
    return { text: unescapeMarkdown(verbatim.text), source: 'verbatim' };
  }

  // 2. Verbatim écrit en bloc `text` (`📢 « … »`) — 15–17 S8 à S12 notamment.
  for (const b of blocks) {
    if (b.t !== 'text') continue;
    const m = b.text.match(MEGAPHONE);
    if (m) return { text: unescapeMarkdown(m[1]), source: 'megaphone' };
  }

  // 3. La formulation qui énonce l'intention (« But : … »).
  const intent = blocks.find((b) => b.t === 'text' && INTENT_PREFIX.test(b.text.trim()));
  if (intent && intent.t === 'text') {
    return { text: unescapeMarkdown(intent.text.trim()), source: 'intent' };
  }

  // 4. Sinon, le texte le plus court de la section.
  let shortest: string | null = null;
  for (const b of blocks) {
    const t = blockText(b);
    if (!t) continue;
    const trimmed = t.trim();
    if (!trimmed) continue;
    if (shortest === null || trimmed.length < shortest.length) shortest = trimmed;
  }
  if (shortest === null) return null;
  return { text: unescapeMarkdown(shortest), source: 'shortest' };
}

/** Vrai si la phrase-clé risque de dépasser 2 lignes à la taille d'affichage. */
export function isKeyPhraseLong(phrase: FieldModeKeyPhrase | null): boolean {
  return !!phrase && phrase.text.length > KEY_PHRASE_MAX;
}

/** Durée cible, lue dans la source uniquement — jamais déduite ni inventée. */
function pickDuration(rawTitle: string, range: [number, number] | null): number | null {
  if (range) return range[1] - range[0];
  const m = rawTitle.match(PAREN_MINUTES);
  if (m) return parseInt(m[2] ?? m[1], 10);
  return null;
}

/**
 * Découpe la fiche de séance en pages — une par temps (section de niveau 2).
 * Le nombre de pages suit la structure réelle de la séance chargée : aucun
 * découpage codé en dur, aucun cas particulier S1 / S7.
 */
export function buildFieldModeSession(script: SessionScript): FieldModeSession {
  const blocks = script.blocks;

  // Bornes des sections de niveau 2 : chaque section ouvre un temps, les blocs
  // qui suivent lui appartiennent jusqu'à la section suivante.
  const starts: number[] = [];
  blocks.forEach((b, i) => {
    if (b.t === 'section' && b.level === 2) starts.push(i);
  });

  // Blocs situés avant le premier en-tête de section.
  const preamble = blocks.slice(0, starts.length ? starts[0] : blocks.length);

  // Certaines fiches ouvrent sur un temps sans en-tête (8–11 S9 : le check-in
  // commence au bloc 0). Si ce préambule porte autre chose que du cadrage, il
  // constitue une page à part entière — sinon ses règles ⚠️ remontent dans le
  // bandeau « Important » de la première page et le reste reste en détail.
  const preambleIsAPage = preamble.some((b) => b.t !== 'callout');

  const pages: FieldModePage[] = [];

  if (preambleIsAPage) {
    // Aucun titre dans la source : on reprend celui de la fiche, sans rien
    // inventer. `blockIndex: -1` = pas d'ancre de section (haut de page).
    pages.push(buildPage(openingTitle(script.title), 0, -1, 0, preamble, []));
  }

  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : blocks.length;
    const section = blocks[start];
    const rawTitle = section.t === 'section' ? section.title : script.title;
    // `start + 1` : la section elle-même n'est pas un bloc de contenu.
    const body = blocks.slice(start + 1, end);
    // Le cadrage de séance n'est porté qu'une fois : par la page de préambule
    // si elle existe, sinon par le premier temps.
    const framing = !preambleIsAPage && i === 0 ? preamble : [];
    pages.push(buildPage(rawTitle, pages.length, start, start + 1, body, framing));
  });

  return { title: unescapeMarkdown(script.title), pages };
}

function buildPage(
  rawTitle: string,
  index: number,
  blockIndex: number,
  baseIndex: number,
  body: ScriptBlock[],
  framing: ScriptBlock[]
): FieldModePage {
  const checklist: FieldModeCheckItem[] = [];
  const indicators: FieldModeIndicator[] = [];
  const notes: FieldModeNote[] = [];
  const important: string[] = [];

  // Les règles ⚠️ du cadrage valent pour toute la séance : verbatim, en tête.
  for (const b of framing) {
    if (b.t === 'callout' && b.icon === '⚠️') important.push(unescapeMarkdown(b.text));
  }

  body.forEach((b, offset) => {
    // Index absolu du bloc dans `script.blocks` : c'est lui qui compose les
    // clés du mode standard.
    const bi = baseIndex + offset;

    switch (b.t) {
      case 'checklist':
        b.items.forEach((item, ii) => {
          checklist.push({ key: `${bi}-${ii}`, label: unescapeMarkdown(item) });
        });
        break;
      case 'grid':
        b.items.forEach((item) => {
          // Clé calquée sur le mode standard : libellé BRUT, non nettoyé.
          indicators.push({ key: `${bi}|${item}`, label: unescapeMarkdown(item) });
        });
        break;
      case 'field':
        // Clé = libellé brut (unique par fiche, vérifié sur les 39 scripts).
        notes.push({
          key: b.label,
          label: unescapeMarkdown(b.label),
          ...(b.hint ? { hint: unescapeMarkdown(b.hint) } : {}),
        });
        break;
      case 'callout':
        if (b.icon === '⚠️') important.push(unescapeMarkdown(b.text));
        break;
      default:
        break;
    }
  });

  const timeRange = parseTimeRange(rawTitle);

  return {
    id: blockIndex < 0 ? 'fm-intro' : `fm-${blockIndex}`,
    index,
    blockIndex,
    title: unescapeMarkdown(rawTitle.replace(TIME_PREFIX, '').trim()) || unescapeMarkdown(rawTitle),
    rawTitle,
    timeRange,
    durationMin: pickDuration(rawTitle, timeRange),
    keyPhrase: pickKeyPhrase(body),
    checklist,
    indicators,
    notes,
    important,
    // Le cadrage de séance reste consultable en détail — rien n'est perdu.
    detail: framing.length ? [...framing, ...body] : body,
  };
}
