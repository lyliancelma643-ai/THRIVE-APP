// ─────────────────────────────────────────────────────────────────────────────
// Parser du fichier maître « Les cartes à la maison » (brief §0.3).
//
// Le contenu parent vit en markdown dans src/content/a-la-maison/paquet-*.md,
// tel que rédigé : on ne reformule rien ici, on découpe. La structure du fichier
// est rigoureusement constante, donc toute dérive (champ manquant, 4 étapes,
// pilier inconnu) fait échouer le parser — et donc les tests — plutôt que de
// laisser passer une carte incomplète.
//
// Pur (aucun accès disque) : utilisé par les tests, qui régénèrent aussi le
// JSON servi à l'app (cards.generated.json).
// ─────────────────────────────────────────────────────────────────────────────

export type Deck = 'A' | 'B' | 'C';
export type CardContext =
  | 'maison'
  | 'voiture'
  | 'apres_match'
  | 'avant_match'
  | 'arena'
  | 'coucher'
  | 'dehors';
export type CardEnergy = 'calme' | 'actif';
export type PillarCode = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';

export type HomeCard = {
  id: string;
  deck: Deck;
  age_min: number;
  age_max: number;
  session: number;
  session_label: string;
  pillar_code: PillarCode;
  pillar_plain: string;
  title: string;
  duration_min: number;
  /** Libellé complet de durée (« 5 minutes pour le créer, 10 secondes par jour »). */
  duration_label: string;
  materials: string;
  /** Mentions de la ligne d'en-tête après le matériel (« En voiture », « À répéter »). */
  notes: string[];
  context: CardContext;
  energy: CardEnergy;
  objective: string;
  session_link: string;
  what_it_builds: string;
  steps: string[];
  script: string;
  trap: string;
  success_marker: string;
  repeatable: boolean;
  unlock_after_session: number;
};

export type DeckInfo = {
  deck: Deck;
  label: string;
  tagline: string;
  /** Paragraphes de l'encart d'introduction (markdown inline conservé). */
  intro: string[];
};

// Les 8 thèmes (brief §0.2 : le code n'est jamais affiché, seul le libellé l'est)
export const PILLARS: Record<string, PillarCode> = {
  'Le moteur intérieur': 'P1',
  'Les preuves': 'P2',
  "Ce qu'il a de bon en lui": 'P3',
  'Les outils qui servent partout': 'P4',
  'Le plaisir et le sens': 'P5',
  'Qui il est': 'P6',
  "L'effort plutôt que le résultat": 'P7',
  'Le bon exercice au bon âge': 'P8',
};

export const DECK_AGES: Record<Deck, [number, number]> = {
  A: [8, 11],
  B: [12, 14],
  C: [15, 17],
};

const FIELD_PATTERNS: [keyof HomeCard, RegExp][] = [
  ['objective', /^\*\*Objectif :\*\* (.+)$/],
  ['session_link', /^\*\*Ce qu'il a fait avec son coach\.\*\* (.+)$/],
  ['what_it_builds', /^\*\*Ce que ça travaille\.\*\* (.+)$/],
  ['script', /^\*\*Demandez-lui :\*\* (.+)$/],
  ['trap', /^\*\*À éviter :\*\* (.+)$/],
  ['success_marker', /^\*\*C'est réussi si :\*\* (.+)$/],
];

// Contexte, énergie et répétabilité ne sont pas écrits dans le fichier : on les
// déduit des mentions de l'en-tête. Champs internes (filtres futurs), jamais
// affichés tels quels.
export function deriveContext(meta: string): CardContext {
  const m = meta.toLowerCase();
  if (/après (chaque|le) match/.test(m)) return 'apres_match';
  if (/avant (un|le) match/.test(m)) return 'avant_match';
  if (/aréna|au club/.test(m)) return 'arena';
  if (/coucher|le soir, allongé/.test(m)) return 'coucher';
  if (/voiture/.test(m)) return 'voiture';
  if (/dehors|en marchant/.test(m)) return 'dehors';
  return 'maison';
}

const ACTIVE_HINTS = ['matériel', 'coussins', 'foulard', 'planche', 'burpees', 'sprint', 'mime', 'cachez', 'raidit'];

export function deriveEnergy(materials: string, steps: string[]): CardEnergy {
  const haystack = `${materials} ${steps.join(' ')}`.toLowerCase();
  return ACTIVE_HINTS.some((h) => haystack.includes(h)) ? 'actif' : 'calme';
}

export function deriveRepeatable(meta: string): boolean {
  return /à répéter|par jour|après chaque match/i.test(meta);
}

function parseMeta(line: string, cardId: string) {
  const inner = line.match(/^\*\*(.+)\*\*$/)?.[1];
  if (!inner) throw new Error(`${cardId} : ligne d'en-tête en gras manquante`);
  const [unlockPart, durationPart, materialsPart, ...notes] = inner.split(' · ');
  const unlock = unlockPart.match(/^Idéal après la séance (\d+)$/);
  if (!unlock) throw new Error(`${cardId} : « Idéal après la séance n » manquant`);
  const minutes = durationPart?.match(/(\d+)\s*minutes?/);
  if (!minutes) throw new Error(`${cardId} : durée illisible (« ${durationPart} »)`);
  const rawMaterials = (materialsPart ?? '').trim();
  return {
    unlock_after_session: Number(unlock[1]),
    duration_min: Number(minutes[1]),
    duration_label: durationPart,
    materials: !rawMaterials || rawMaterials === 'Rien' ? 'aucun' : rawMaterials,
    notes,
    rawMeta: inner,
  };
}

export function parseDeckMarkdown(md: string): { info: DeckInfo; cards: HomeCard[] } {
  const lines = md.split(/\r?\n/);
  let info: DeckInfo | null = null;
  let session: { n: number; label: string } | null = null;
  const cards: HomeCard[] = [];
  let introBuffer: string[] = [];
  let introDone = false;

  let i = 0;
  const next = () => lines[i++];

  while (i < lines.length) {
    const line = next().trimEnd();

    const deckMatch = line.match(/^# PAQUET ([ABC]) — (.+)$/);
    if (deckMatch) {
      const tagline = lines[i]?.match(/^### (.+)$/)?.[1];
      if (!tagline) throw new Error(`Paquet ${deckMatch[1]} : sous-titre manquant`);
      i++;
      info = { deck: deckMatch[1] as Deck, label: deckMatch[2], tagline, intro: [] };
      continue;
    }
    if (!info) continue;

    // Encart d'introduction du paquet : paragraphes séparés par une ligne « > »
    if (!introDone && line.startsWith('>')) {
      const text = line.replace(/^>\s?/, '');
      if (text === '') {
        if (introBuffer.length) info.intro.push(introBuffer.join('\n'));
        introBuffer = [];
      } else {
        introBuffer.push(text);
      }
      continue;
    }
    if (!introDone && introBuffer.length && !line.startsWith('>')) {
      info.intro.push(introBuffer.join('\n'));
      introBuffer = [];
      introDone = true;
    }

    const sessionMatch = line.match(/^## SÉANCE (\d+) — (.+)$/);
    if (sessionMatch) {
      session = { n: Number(sessionMatch[1]), label: sessionMatch[2] };
      continue;
    }

    const cardMatch = line.match(/^### ([ABC]\d{2}) · (.+)$/);
    if (!cardMatch) continue;

    const id = cardMatch[1];
    if (!session) throw new Error(`${id} : carte hors séance`);
    if (id[0] !== info.deck) throw new Error(`${id} : rangée dans le paquet ${info.deck}`);

    const meta = parseMeta(next().trim(), id);
    const fields: Partial<Record<keyof HomeCard, string>> = {};
    const steps: string[] = [];

    // Corps de la carte jusqu'à la prochaine carte / séance / séparateur
    while (i < lines.length && !/^(### |## |---)/.test(lines[i])) {
      const body = next().trim();
      if (body === '**Comment faire**') {
        while (i < lines.length && lines[i].startsWith('- ')) steps.push(next().slice(2).trim());
        continue;
      }
      for (const [key, re] of FIELD_PATTERNS) {
        const m = body.match(re);
        if (m) fields[key] = m[1].trim();
      }
    }

    for (const [key] of FIELD_PATTERNS) {
      if (!fields[key]) throw new Error(`${id} : champ « ${key} » manquant`);
    }
    if (steps.length === 0 || steps.length > 3) {
      throw new Error(`${id} : ${steps.length} étapes (1 à 3 attendues)`);
    }

    const pillarPlain = fields.what_it_builds!.match(/^\*([^*]+?)\.?\*/)?.[1];
    const pillarCode = pillarPlain ? PILLARS[pillarPlain] : undefined;
    if (!pillarPlain || !pillarCode) throw new Error(`${id} : pilier introuvable`);

    const [ageMin, ageMax] = DECK_AGES[info.deck];
    cards.push({
      id,
      deck: info.deck,
      age_min: ageMin,
      age_max: ageMax,
      session: session.n,
      session_label: session.label,
      pillar_code: pillarCode,
      pillar_plain: pillarPlain,
      title: cardMatch[2],
      duration_min: meta.duration_min,
      duration_label: meta.duration_label,
      materials: meta.materials,
      notes: meta.notes,
      context: deriveContext(meta.rawMeta),
      energy: deriveEnergy(meta.materials, steps),
      objective: fields.objective!,
      session_link: fields.session_link!,
      what_it_builds: fields.what_it_builds!,
      steps,
      script: fields.script!,
      trap: fields.trap!,
      success_marker: fields.success_marker!,
      repeatable: deriveRepeatable(meta.rawMeta),
      unlock_after_session: meta.unlock_after_session,
    });
  }

  if (!info) throw new Error('En-tête « # PAQUET » introuvable');
  return { info, cards };
}
