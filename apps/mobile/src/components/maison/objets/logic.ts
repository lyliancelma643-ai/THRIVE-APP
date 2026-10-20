// Objets du carnet (N2 Fiche Identité, N3 Boîte à Outils, N4 Certificat, « La lettre »).
// Logique PURE (aucun React, aucune API native) : titres, blocs, textes et dates reprennent le web
// (`apps/web/src/components/parent/p3/RewardView.tsx`) mot pour mot. Le payload d'un objet est figé dans
// `p3_rewards` au moment où il est gagné ; rien n'est inventé ici.
import { REWARDS, fill, formatFullDate, inOneYear, type RewardId } from '../../../lib/p3';

export type Block = { label: string; lines: string[] };
export type RewardPayload = Record<string, unknown> | null;
export type RewardRow = { reward_id: string; payload: RewardPayload; earned_at: string };

/** Objet « pas encore gagné » (web : `ObjetInner`). */
export const LOCKED_TEXT = 'Cet objet s’assemble au fil du programme, moment après moment.';
export const LOCKED_BACK_LABEL = 'Retour à Maison';
export const EMPTY_BLOCK_TEXT = 'Rien de noté ici.';
export const IDENTITY_FOOTER = 'À garder. On y revient en semaine 13.';
export const TOOLS_RECTO_COUNT = 3;
export const TOOLS_VERSO_COUNT = 5;
export const TOOLS_VERSO_LABEL = 'Et aussi';

/** Lignes de texte d'un champ de payload (chaînes, ou objets `{ text }`). */
export function list(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x : (x as { text?: string } | null)?.text ?? '')).filter(Boolean);
  }
  return typeof v === 'string' && v ? [v] : [];
}

export function rewardTitle(id: RewardId, firstName: string): string {
  switch (id) {
    case 'fiche_identite':
      return `La Fiche Identité de ${firstName}`;
    case 'bilan_mi_parcours':
      return `Six semaines avec ${firstName}`;
    case 'boite_a_outils':
      return `La Boîte à Outils de ${firstName}`;
    case 'certificat':
      return 'Certificat THRIVE Maison';
    default:
      return fill(REWARDS.find((r) => r.id === id)?.label ?? '', { prenom: firstName });
  }
}

export function blocksFor(id: RewardId, payload: RewardPayload): Block[] {
  const p = payload ?? {};
  switch (id) {
    case 'fiche_identite':
      return [
        { label: 'Ses trois forces', lines: list(p.forces) },
        { label: 'Ce qu’il choisit quand il choisit', lines: list(p.choix) },
        { label: 'Son rêve de l’année, dans ses mots', lines: list(p.reve) },
      ];
    case 'bilan_mi_parcours':
      return [
        { label: 'Son podium', lines: list(p.podium) },
        { label: 'Son objectif, ajusté', lines: list(p.objectif) },
        { label: 'Ce que tu as vu changer', lines: list(p.vu_par_le_parent) },
      ];
    case 'boite_a_outils':
      return [{ label: 'Ses outils, nommés par lui', lines: list(p.outils) }];
    default:
      return [];
  }
}

/** « 14 octobre 2027 », ou chaîne vide si la date est absente ou illisible (jamais « Invalid Date »). */
export function fullDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : formatFullDate(d);
}

/**
 * « La lettre » : DATES SEULEMENT, jamais le texte (R12, décision D4). Le payload ne contient que `sealed_at`.
 * Sans date de scellement : la lettre se garde sur papier, dans son enveloppe fermée.
 */
export function letterLine(payload: RewardPayload, firstName: string): string {
  const sealed = typeof payload?.sealed_at === 'string' ? payload.sealed_at : null;
  const sealedDate = fullDate(sealed);
  if (sealed && sealedDate) {
    return `Lettre scellée le ${sealedDate}. Elle te reviendra le ${fullDate(inOneYear(new Date(sealed)))}.`;
  }
  return `La lettre de ${firstName} se garde sur papier, dans son enveloppe fermée.`;
}

export type SheetModel = { kind: 'sheet'; id: RewardId; title: string; blocks: Block[]; footer: string; assembled: string | null };
export type ToolsModel = { kind: 'tools'; id: RewardId; title: string; recto: string[]; verso: string[]; dateLine: string; assembled: string | null };
export type CertificateModel = {
  kind: 'certificate';
  id: RewardId;
  title: string;
  firstName: string;
  intro: string;
  columns: Block[];
  keep: string | null;
  dateLine: string;
  /** Pied de la version imprimée / image (comme le web). */
  footer: string;
};
export type LetterModel = { kind: 'letter'; id: RewardId; eyebrow: string; line: string };
export type LockedModel = { kind: 'locked'; text: string; backLabel: string };
export type ObjectModel = SheetModel | ToolsModel | CertificateModel | LetterModel | LockedModel;

export const LOCKED: LockedModel = { kind: 'locked', text: LOCKED_TEXT, backLabel: LOCKED_BACK_LABEL };

/** « Assemblée depuis le carnet le jour où la semaine N s’est complétée. Elle ne change plus. » (N2) */
function assembledLine(id: RewardId): string | null {
  const t = REWARDS.find((r) => r.id === id)?.trigger;
  return t && t.kind === 'week_complete'
    ? `Assemblée depuis le carnet le jour où la semaine ${t.week} s’est complétée. Elle ne change plus.`
    : null;
}

const isRewardId = (id: string): id is RewardId => REWARDS.some((r) => r.id === id && r.available);

/**
 * Modèle d'affichage d'un objet. Gagné = une ligne `p3_rewards` existe, OU le carnet le calcule comme gagné
 * (`earnedIds`, venant de `carnetObjects`) : aucun recalcul de droits ici, aucune écriture.
 * `fallbackDate` sert quand la ligne n'existe pas encore (date du dernier moment vécu).
 */
export function buildObjectModel(input: {
  id: string;
  firstName: string;
  row: { payload: RewardPayload; earned_at: string } | null;
  earnedIds: ReadonlySet<string>;
  fallbackDate?: string | null;
}): ObjectModel {
  const { id, firstName, row, earnedIds, fallbackDate } = input;
  if (!isRewardId(id)) return LOCKED;
  if (!row && !earnedIds.has(id)) return LOCKED;

  const payload = row?.payload ?? null;
  const earnedAt = row?.earned_at ?? fallbackDate ?? null;
  const title = rewardTitle(id, firstName);

  if (id === 'lettre_un_an') {
    return { kind: 'letter', id, eyebrow: 'La lettre', line: letterLine(payload, firstName) };
  }

  if (id === 'certificat') {
    const keep = list(payload?.a_garder);
    const s1 = list(payload?.forces_s1);
    const s13 = list(payload?.forces_s13);
    const date = fullDate(earnedAt);
    return {
      kind: 'certificate',
      id,
      title,
      firstName,
      intro: 'a terminé les 13 semaines du programme THRIVE Maison',
      columns: [
        { label: 'Ses forces en semaine 1', lines: s1 },
        { label: 'Ses forces en semaine 13', lines: s13 },
      ],
      keep: keep[0] ?? null,
      dateLine: date,
      footer: `${firstName} a terminé les 13 semaines du programme THRIVE Maison${date ? ` · ${date}` : ''}`,
    };
  }

  const blocks = blocksFor(id, payload);

  if (id === 'boite_a_outils') {
    const tools = blocks[0]?.lines ?? [];
    return {
      kind: 'tools',
      id,
      title,
      recto: tools.slice(0, TOOLS_RECTO_COUNT),
      verso: tools.slice(TOOLS_RECTO_COUNT, TOOLS_RECTO_COUNT + TOOLS_VERSO_COUNT),
      dateLine: fullDate(earnedAt),
      assembled: null,
    };
  }

  return {
    kind: 'sheet',
    id,
    title,
    blocks,
    footer: id === 'fiche_identite' ? IDENTITY_FOOTER : fullDate(earnedAt),
    assembled: assembledLine(id),
  };
}

/** Un objet imprimable / enregistrable en image a une carte ; la lettre et l'objet verrouillé n'en ont pas. */
export function hasCard(m: ObjectModel): m is SheetModel | ToolsModel | CertificateModel {
  return m.kind === 'sheet' || m.kind === 'tools' || m.kind === 'certificate';
}

// ── Impression (expo-print) ──────────────────────────────────────────────────

/** Couleurs de la charte (identiques au web : crème, marine, sauge, émail). */
export const PRINT_COLORS = { paper: '#F7F5F2', ink: '#022539', ink2: '#33454F', sage: '#46695F', tint: '#004E7A', enamel: '#F9EB50' } as const;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const C = PRINT_COLORS;
const css = (page: string) => `
@page { ${page} }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${C.paper}; color: ${C.ink}; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
.eyebrow { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: ${C.sage}; }
.title { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: 26px; line-height: 1.2; color: ${C.ink}; }
.line { margin: 4px 0 0; font-size: 15px; line-height: 1.4; color: ${C.ink}; }
.empty { margin: 6px 0 0; font-size: 13px; color: ${C.ink2}; }
.foot { margin: 20px 0 0; font-family: Georgia, serif; font-style: italic; font-size: 13px; color: ${C.ink2}; }
.star { display: block; width: 44px; height: 44px; margin-top: 18px; border-radius: 22px; background: ${C.enamel}; color: ${C.ink}; text-align: center; line-height: 44px; font-size: 22px; }
.frame { border: 1px solid ${C.sage}; border-radius: 12px; padding: 22px 20px; }
`;

function sheetHtml(m: SheetModel): string {
  const blocks = m.blocks
    .map(
      (b) =>
        `<div style="margin-top:16px"><p class="eyebrow">${escapeHtml(b.label)}</p>${
          b.lines.length
            ? b.lines.map((l) => `<p class="line">${escapeHtml(l)}</p>`).join('')
            : `<p class="empty">${escapeHtml(EMPTY_BLOCK_TEXT)}</p>`
        }</div>`,
    )
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css('margin: 18mm;')}</style></head><body>
<div class="frame"><p class="title">${escapeHtml(m.title)}</p>${blocks}<p class="foot">${escapeHtml(m.footer)}</p><span class="star">&#9733;</span></div></body></html>`;
}

function certificateHtml(m: CertificateModel): string {
  const cols = m.columns
    .map(
      (b) =>
        `<div style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,49,76,.12);text-align:left"><p class="eyebrow">${escapeHtml(b.label)}</p>${b.lines
          .map((l) => `<p class="line" style="font-size:13px">${escapeHtml(l)}</p>`)
          .join('')}</div>`,
    )
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css('margin: 18mm;')}</style></head><body>
<div class="frame" style="text-align:center"><p class="eyebrow">${escapeHtml(m.title)}</p>
<p class="title" style="font-size:44px;margin-top:10px">${escapeHtml(m.firstName)}</p>
<p class="line" style="color:${C.ink2}">${escapeHtml(m.intro)}</p>
<div style="display:flex;gap:10px;margin-top:22px">${cols}</div>
${m.keep ? `<p class="title" style="font-size:19px;font-style:italic;margin-top:20px">&laquo;&nbsp;${escapeHtml(m.keep)}&nbsp;&raquo;</p>` : ''}
${m.dateLine ? `<p class="foot" style="margin-top:14px">${escapeHtml(m.dateLine)}</p>` : ''}
<span class="star" style="margin-left:auto;margin-right:auto">&#9733;</span></div></body></html>`;
}

function toolsHtml(m: ToolsModel): string {
  const card = (eyebrow: string, lines: string[], size: number) =>
    `<section style="width:85mm;height:55mm;padding:5mm;page-break-after:always;position:relative;overflow:hidden"><p class="eyebrow">${escapeHtml(eyebrow)}</p>${lines
      .map((l) => `<p class="line" style="font-size:${size}px;margin-top:3px">${escapeHtml(l)}</p>`)
      .join('')}<span style="position:absolute;right:5mm;bottom:4mm;font-size:8px;font-weight:600;letter-spacing:.08em;color:${C.sage}">THRIVE MAISON</span></section>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css('size: 85mm 55mm; margin: 0;')}</style></head><body>
${card(m.title, m.recto, 12)}${m.verso.length ? card(TOOLS_VERSO_LABEL, m.verso, 11) : ''}</body></html>`;
}

/** HTML de la carte pour `expo-print` ; `null` quand il n'y a rien à imprimer (lettre, objet verrouillé). */
export function buildPrintHtml(m: ObjectModel): string | null {
  if (m.kind === 'sheet') return sheetHtml(m);
  if (m.kind === 'certificate') return certificateHtml(m);
  if (m.kind === 'tools') return toolsHtml(m);
  return null;
}
