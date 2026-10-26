// Petits textes affichés pendant une attente (MicroTip). Tutoiement, sans genre pour l'enfant, ≤ 120 caractères.
export type MicroFamily = 'definition' | 'parent' | 'question' | 'reminder';

export type Micro = {
  id: string;
  family: MicroFamily;
  text: string;
  contexts: string[];
  weeks?: number[];
  options?: string[];
  reviewed: boolean;
};

export type MicroContext = 'ouverture' | 'paiement' | 'upload' | 'lettre' | 'souffle' | 'post-activite';

export const MICROCOPY_MAX = 120;
const WAIT: string[] = ['ouverture', 'paiement', 'upload', 'lettre'];

export const MICROCOPY: Micro[] = [
  // Rappels (seulement si la donnée existe)
  { id: 'rem-semaine-suivante', family: 'reminder', text: 'Il reste {n} {activités} pour ouvrir la semaine {w}.', contexts: ['ouverture', 'post-activite'], reviewed: true },
  { id: 'rem-premiere-marche', family: 'reminder', text: 'Ce soir : la première marche de {prenom}, dix minutes.', contexts: ['ouverture'], reviewed: true },
  { id: 'rem-phrases', family: 'reminder', text: '{prenom} a gardé {n} {phrases} depuis le début.', contexts: ['ouverture', 'upload', 'post-activite'], reviewed: true },
  { id: 'rem-lettre', family: 'reminder', text: 'Ta lettre reviendra le {date}.', contexts: ['ouverture', 'lettre'], reviewed: true },
  // Définitions (à valider par Lylian avant la production)
  { id: 'def-smart', family: 'definition', text: 'Objectif SMART : spécifique, mesurable, atteignable, réaliste, temporel. Pour un enfant, une seule marche, ce soir.', contexts: WAIT, weeks: [2], reviewed: false },
  { id: 'def-controle', family: 'definition', text: 'Ce qui dépend de lui : son effort, sa préparation, son attitude. Pas l’arbitre, pas la météo.', contexts: WAIT, weeks: [2], reviewed: false },
  { id: 'def-un-sur-trois', family: 'definition', text: 'Le défi une fois sur trois : assez dur pour demander de l’effort, assez facile pour y croire.', contexts: WAIT, weeks: [3], reviewed: false },
  { id: 'def-courage', family: 'definition', text: 'Le courage, ce n’est pas l’absence de peur. C’est y aller quand même.', contexts: WAIT, weeks: [3], reviewed: false },
  { id: 'def-pas-encore', family: 'definition', text: 'Pas encore. Deux petits mots qui changent « je n’y arrive pas » en « j’y travaille ».', contexts: WAIT, reviewed: false },
  { id: 'def-expiration', family: 'definition', text: 'Une expiration plus longue que l’inspiration aide le corps à redescendre.', contexts: ['souffle'], reviewed: false },
  { id: 'def-effort', family: 'definition', text: 'Féliciter l’effort plutôt que le résultat : « tu t’es accroché » plutôt que « t’es doué ».', contexts: ['post-activite'], reviewed: false },
  // Mots doux pour le parent
  { id: 'par-rien-obligatoire', family: 'parent', text: 'Rien n’est obligatoire. Les trois suffisent.', contexts: [...WAIT, 'post-activite'], reviewed: true },
  { id: 'par-dix-minutes', family: 'parent', text: 'Dix minutes, c’est déjà beaucoup.', contexts: [...WAIT, 'post-activite'], reviewed: true },
  { id: 'par-soir-rate', family: 'parent', text: 'Un soir raté ne défait pas une semaine.', contexts: [...WAIT, 'post-activite'], reviewed: true },
  { id: 'par-pas-parfait', family: 'parent', text: 'Tu n’as pas à être parfait. Juste là.', contexts: [...WAIT, 'post-activite'], reviewed: true },
  { id: 'par-arrete', family: 'parent', text: 'Ce soir, tu t’es arrêté pour {prenom}. Ça compte.', contexts: ['post-activite'], reviewed: true },
  { id: 'par-respire', family: 'parent', text: 'Respire. Tu fais déjà plus que tu ne le crois.', contexts: [...WAIT, 'souffle'], reviewed: true },
  // Petites questions d'un tap (jamais bloquantes ; réponses gardées en local)
  { id: 'q-fierte', family: 'question', text: 'Une chose dont tu es fier(e) chez {prenom} cette semaine ?', contexts: ['post-activite'], options: ['Son effort', 'Son courage', 'Sa gentillesse', 'Autre'], reviewed: true },
  { id: 'q-energie', family: 'question', text: 'Ce soir, plutôt énergie haute ou basse ?', contexts: ['ouverture'], options: ['Haute', 'Basse'], reviewed: true },
  { id: 'q-marche-demain', family: 'question', text: 'Quelle petite marche pour demain ?', contexts: ['post-activite'], options: ['5 minutes', '10 minutes', 'Pas demain'], reviewed: true },
  { id: 'q-mot-semaine', family: 'question', text: 'Un mot pour décrire sa semaine ?', contexts: ['post-activite'], options: ['Fier', 'Fatigué', 'Curieux', 'Autre'], reviewed: true },
];

/** Drapeau simple : les définitions non relues ne s'affichent qu'en développement. */
export const microcopyConfig: { showUnreviewed: boolean } = {
  showUnreviewed: typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production',
};

export type MicroData = {
  /** Activités restantes avant d'ouvrir la semaine suivante. */
  unlock?: { remaining: number; nextWeek: number } | null;
  firstStepTonight?: boolean;
  phrasesKept?: number | null;
  /** Date de retour de la lettre, déjà formatée (« 25 janvier »). */
  letterDate?: string | null;
};

export type PickInput = {
  context: MicroContext;
  week?: number | null;
  childName?: string | null;
  data?: MicroData;
  lastShownId?: string | null;
  /** Force une famille (ex. 'question' après une activité). */
  family?: MicroFamily;
  showUnreviewed?: boolean;
};

export type PickedMicro = Micro & { resolved: string };

function fill(m: Micro, name: string | null, data: MicroData): string | null {
  let t = m.text;
  if (t.includes('{prenom}')) {
    if (!name) return null;
    t = t.replace(/\{prenom\}/g, name);
  }
  if (m.family === 'reminder') {
    switch (m.id) {
      case 'rem-semaine-suivante': {
        const u = data.unlock;
        if (!u || u.remaining <= 0) return null;
        t = t.replace('{n}', String(u.remaining)).replace('{activités}', u.remaining > 1 ? 'activités' : 'activité').replace('{w}', String(u.nextWeek));
        break;
      }
      case 'rem-premiere-marche':
        if (!data.firstStepTonight) return null;
        break;
      case 'rem-phrases': {
        const n = data.phrasesKept;
        if (!n || n <= 0) return null;
        t = t.replace('{n}', String(n)).replace('{phrases}', n > 1 ? 'phrases' : 'phrase');
        break;
      }
      case 'rem-lettre':
        if (!data.letterDate) return null;
        t = t.replace('{date}', data.letterDate);
        break;
    }
  }
  return t;
}

/**
 * Choix déterministe par contexte : rappel (si donnée) → définition de la semaine → mot doux pour le parent.
 * Jamais deux fois le même d'affilée. Renvoie null s'il n'y a rien d'adapté.
 */
export function pickMicrocopy(input: PickInput): PickedMicro | null {
  const { context, week = null, childName = null, data = {}, lastShownId = null, family } = input;
  const showUnreviewed = input.showUnreviewed ?? microcopyConfig.showUnreviewed;
  const order: MicroFamily[] = family ? [family] : ['reminder', 'definition', 'parent'];
  for (const fam of order) {
    const pool = MICROCOPY.filter((m) => m.family === fam && m.contexts.includes(context) && (showUnreviewed || m.reviewed));
    // Les définitions propres à la semaine passent avant les générales.
    const sorted =
      fam === 'definition'
        ? [...pool.filter((m) => m.weeks?.includes(week ?? -1)), ...pool.filter((m) => !m.weeks)]
        : pool;
    for (const m of sorted) {
      if (m.id === lastShownId) continue;
      const resolved = fill(m, childName, data);
      if (resolved) return { ...m, resolved };
    }
  }
  return null;
}
