// Contenu des supports visuels du mode activité (VI1–VI8), sans React ni API native : testable en pur.
// Les textes sont ceux du web (apps/web/src/components/parent/p3/Visuals.tsx), repris MOT POUR MOT ; ce fichier n'est pas
// importable depuis le web (composant client), d'où cette copie unique côté mobile. Le test `content.test.ts` relit le fichier web
// et échoue si un texte dérive. Les `id` servent aux pictogrammes SVG (glyphs.tsx) : aucun emoji côté mobile.

import type { VisualId } from '../../../lib/p3';

export const VISUAL_LABELS: Record<VisualId, string> = {
  emotions: 'Les six émotions',
  thermometre: 'Le thermomètre',
  colonnes: 'Les deux colonnes',
  escalier: 'L’escalier',
  carte: 'La carte de ses personnes',
  sens: 'Les trois sens',
  endroits: 'Trois endroits',
  outils: 'Ses outils',
};

export const VISUAL_HINTS: Record<VisualId, string> = {
  emotions: 'Il montre du doigt l’émotion. Touche-la pour l’agrandir.',
  thermometre: 'Il montre son chiffre, de 1 (tout calme) à 10 (ça déborde).',
  colonnes: 'Le modèle à recopier sur une feuille. L’exemple est volontairement sur un autre sujet.',
  escalier: 'Le modèle à dessiner : son objectif tout en haut, la marche la plus facile en bas.',
  carte: 'Le modèle à dessiner : lui au milieu, ses personnes autour.',
  sens: 'Une question à la fois, dans cet ordre.',
  endroits: 'Pour chaque outil, un usage à chaque endroit.',
  outils: 'S’il ne se souvient plus, pointe un outil : « Celui-là, tu pourrais l’utiliser où ? »',
};

/** Sous-titre du bouton « Montrer : … » (MV). */
export const VISUAL_BUTTON_SUB = 'À l’écran, pour qu’il montre du doigt';
export const VISUAL_BACK = 'Revenir à l’activité';

export const EMOTIONS = [
  { id: 'joie', label: 'La joie' },
  { id: 'peur', label: 'La peur' },
  { id: 'colere', label: 'La colère' },
  { id: 'frustration', label: 'La frustration' },
  { id: 'fierte', label: 'La fierté' },
  { id: 'nervosite', label: 'La nervosité' },
] as const;

export type ToolEntry = { id: string; name: string; ask: string; what: string; week: number; from: string[] };

/** Les outils des 13 semaines, avec la fiche où l'enfant les a notés dans ses mots. */
export const TOOLS: ToolEntry[] = [
  { id: 'forces', name: 'Mes forces', ask: 'Tes forces', what: 'Ce que je fais bien, avec la preuve.', week: 1, from: ['ACT-0101'] },
  { id: 'depend', name: 'Ce qui dépend de moi', ask: 'Tes deux colonnes', what: 'Les deux colonnes : je m’occupe de ma colonne.', week: 2, from: ['ACT-0201'] },
  { id: 'escalier', name: 'Mon escalier', ask: 'Ton escalier', what: 'Une marche à la fois, la plus petite d’abord.', week: 2, from: ['ACT-0202', 'ACT-0702'] },
  { id: 'cran', name: 'Un cran au-dessus', ask: 'Ton défi un cran au-dessus', what: 'Le défi que je réussis une fois sur trois.', week: 3, from: ['ACT-0302'] },
  { id: 'mot', name: 'Mettre un mot', ask: 'Mettre un mot sur ce que tu sens', what: 'Je nomme mon émotion quand elle arrive.', week: 4, from: ['ACT-0401', 'ACT-0402'] },
  { id: 'ballon', name: 'Le ballon', ask: 'Ton ballon', what: 'Je gonfle mon ventre sur 4, je dégonfle sur 8.', week: 5, from: ['ACT-0501'] },
  { id: 'phrase', name: 'Ma phrase', ask: 'Ta phrase', what: 'Ce que je me dis pour recommencer.', week: 5, from: ['ACT-0502', 'ACT-0504'] },
  { id: 'spaghetti', name: 'Spaghetti cuit', ask: 'Ton spaghetti cuit', what: 'Je relâche tout et je sens mes pieds.', week: 6, from: ['ACT-0601', 'ACT-0602'] },
  { id: 'personnes', name: 'Mes personnes', ask: 'Tes personnes', what: 'Je sais qui aller voir, et pour quoi.', week: 8, from: ['ACT-0801', 'ACT-0804'] },
  { id: 'monmot', name: 'Mon mot', ask: 'Ton mot', what: 'Il ramène ma tête quand elle part ailleurs.', week: 9, from: ['ACT-0901'] },
  { id: 'film', name: 'Mon film', ask: 'Ton film', what: 'Je me vois réussir avant de le faire.', week: 10, from: ['ACT-1001', 'ACT-1002'] },
];

// Espaces insécables du web (« Demande\u00a0: «\u00a0… »\u00a0») : mêmes octets, pour que le texte soit identique mot pour mot.
const NBSP = '\u00a0';

/** « Demande : « {ask}, tu pourrais t'en servir où ? » » — affiché à l'outil touché. */
export function toolAskLine(ask: string): string {
  return `Demande${NBSP}: «${NBSP}${ask}, tu pourrais t’en servir où${NBSP}?${NBSP}»`;
}

/** « Dans ses mots : « … » » — null quand l'enfant n'a rien noté. */
export function toolWordsLine(tool: ToolEntry, notes: Record<string, string>): string | null {
  const his = tool.from.map((id) => notes[id]).find(Boolean);
  return his ? `Dans ses mots${NBSP}: «${NBSP}${his}${NBSP}»` : null;
}

export const THERMO = { min: 1, max: 10, calm: 'tout calme', over: 'ça déborde' } as const;

export const COLONNES = {
  example: 'Exemple : réussir un gâteau',
  mine: { title: 'Ça dépend de moi', items: ['Suivre la recette', 'Bien mesurer', 'Demander de l’aide'] },
  notMine: { title: 'Ça ne dépend pas de moi', items: ['Le four qui chauffe mal', 'Les goûts des invités'] },
} as const;

/** De la marche la plus facile (première) à l'objectif (dernière). */
export const ESCALIER_STEPS = ['La plus facile', 'Un peu plus dure', 'Encore un peu plus', 'Ton objectif'] as const;

export const CARTE = {
  center: 'Toi',
  around: ['Prénom — pour quoi ?', 'Prénom — pour quoi ?', 'Prénom — pour quoi ?', 'Hors de la maison ?'],
} as const;

export type VisualListItem = { id: string; title: string; sub: string };

export const SENS_ITEMS: VisualListItem[] = [
  { id: 'voir', title: 'Tu vois quoi ?', sub: 'Les couleurs, les gens, l’endroit.' },
  { id: 'entendre', title: 'Tu entends quoi ?', sub: 'Les bruits, les voix, le silence.' },
  { id: 'sentir', title: 'Tu sens quoi ?', sub: 'Dans tes mains, tes pieds, ton ventre.' },
];

export const ENDROITS_ITEMS: VisualListItem[] = [
  { id: 'ecole', title: 'L’école', sub: 'En classe, en examen, à la récré.' },
  { id: 'amis', title: 'Les amis', sub: 'Au sport, dehors, en ligne.' },
  { id: 'maison', title: 'La maison', sub: 'Les devoirs, les disputes, le coucher.' },
];

// ── État d'affichage ─────────────────────────────────────────────────────────

/** Une seule case mise en avant à la fois : re-toucher la case active la retire. */
export function toggleSelection<T>(current: T | null, next: T): T | null {
  return current === next ? null : next;
}

/** Ce que l'enfant a noté, par fiche : la capture (liste jointe ou texte), sinon la phrase gardée ; la plus récente d'abord. */
export type NoteMoment = {
  activity_id: string;
  created_at: string;
  kept_phrase: string | null;
  capture?: { items?: string[] | null; text?: string | null } | null;
};

export function notesFromMoments(moments: NoteMoment[]): Record<string, string> {
  const out: Record<string, string> = {};
  const sorted = [...moments].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const m of sorted) {
    if (out[m.activity_id]) continue;
    const items = (m.capture?.items ?? []).map((s) => s.trim()).filter(Boolean);
    const fromCapture = items.length ? items.join(' · ') : m.capture?.text?.trim() || null;
    const t = fromCapture ?? m.kept_phrase?.trim();
    if (t) out[m.activity_id] = t;
  }
  return out;
}
