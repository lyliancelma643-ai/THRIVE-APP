// ─────────────────────────────────────────────────────────────────────────────
// P3 « Le moment qui compte » — parser des 13 fichiers semaine-XX.md.
//
// Même philosophie que le module « À la maison » (lib/home-cards/parse.ts) :
// le contenu parent vit en markdown dans src/content/p3-moments/, tel que
// rédigé et validé par Lylian. On ne reformule rien ici, on découpe et on
// VÉRIFIE. Toute dérive du gabarit (4 interdits, étape d'écran trop longue,
// question de transfert en semaine 1, pilier inconnu, extension manquante…)
// fait échouer le parser — donc les tests — au lieu de publier une fiche
// incomplète.
//
// Pur (aucun accès disque) : utilisé par les tests, qui régénèrent aussi le
// JSON servi à l'app (activities.generated.json).
// ─────────────────────────────────────────────────────────────────────────────

export type Phase = 'ANCRER' | 'DEVELOPPER' | 'INTEGRER';
export type PillarCode = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';
export type Role = 'decouvrir' | 'pratiquer' | 'transferer' | 'ancrer';
export type AgeBand = '8-11' | '12-14' | '15-17';
export type Place = 'maison' | 'exterieur' | 'voiture' | 'partout';
export type ParentEnergy = 'basse' | 'moyenne' | 'haute';
export type Movement = 'assis' | 'debout' | 'actif';
export type DayMoment = 'matin' | 'apres-ecole' | 'soir' | 'week-end' | 'indifferent';
export type ChildMood = 'agite' | 'fatigue' | 'renfrogne' | 'disponible' | 'indifferent';
export type Duration = 10 | 20 | 30;
/** Les 3 questions invariantes de la Méthode (Pierce et al., 2017). */
export type DebriefKind = 'vecu' | 'fait' | 'ailleurs';
export type ExtensionKind = 'approfondir' | 'ancrer' | 'transferer';
/** Ce que la fiche dépose dans le carnet (et, le cas échéant, dans un objet symbolique). */
export type CaptureKind =
  | 'forces'
  | 'choix'
  | 'reve'
  | 'objectif'
  | 'emotion'
  | 'outil'
  | 'mot'
  | 'personnes'
  | 'progres'
  | 'phrase'
  | 'lettre';
export type Unlock = 'fiche_identite' | 'bilan_mi_parcours' | 'boite_a_outils' | 'certificat' | 'lettre_un_an';

export type SourceRef = { citation: string; level: 'A' | 'B' | 'C' };

export type P3Week = {
  week: number;
  title: string;
  phase: Phase;
  session_source: string;
  action: string;
  skill: string;
  pillars: PillarCode[];
  opening_line: string;
  transfer: boolean;
  unlocks: Unlock | null;
  foundation: string;
  intro: string[];
  /** brouillon → revu (relu par Claude) → publie (validé par Lylian). Seul « publie » sort en prod. */
  status: 'brouillon' | 'revu' | 'publie';
};

export type P3Activity = {
  id: string; // ACT-SSRR
  week: number;
  rank: 1 | 2 | 3;
  role: Role;
  phase: Phase;
  title: string;
  subtitle: string;
  objective: string;
  durations: Duration[];
  duration_type: 'modulaire' | 'native';
  base_duration: Duration;
  age_bands: AgeBand[];
  places: Place[];
  car_ok: boolean;
  materials: string[];
  specific_materials: boolean;
  parent_energy: ParentEnergy;
  movement: Movement;
  moments: DayMoment[];
  child_moods: ChildMood[];
  anti_refusal: boolean;
  pillar_main: PillarCode;
  pillars_secondary: PillarCode[];
  capture: { kind: CaptureKind; label: string } | null;
  origin: string;
  /** Amorce ; peut contenir {duree} → « dix minutes », « vingt minutes »… */
  opener: string;
  opener_is_dynamic: boolean;
  steps: string[];
  /** Mode activité : une étape par écran, ≤ 10 mots, même nombre que steps. */
  screen_steps: string[];
  donts: [string, string, string];
  what_you_will_see: string;
  debrief: { kind: DebriefKind; question: string }[];
  closing: string;
  why_one_line: string;
  why_detail: string;
  method_ref: string;
  sources: SourceRef[];
  extensions: { adds_to: 20 | 30; kind: ExtensionKind; text: string }[];
  variants: { band: '12-14' | '15-17'; opener: string | null; text: string }[];
  why_it_fails: string;
  status: 'brouillon' | 'revu' | 'publie';
};

export const PILLAR_LABELS: Record<PillarCode, string> = {
  P1: 'Autodétermination',
  P2: 'Efficacité personnelle',
  P3: 'Développement positif (5C)',
  P4: 'Life skills par le sport',
  P5: 'PERMA',
  P6: 'Forces de caractère (VIA)',
  P7: "Buts d'accomplissement et routines",
  P8: 'DMSP et pratique délibérée',
};

/** Liste blanche du matériel (spec module Activités §2.3). */
export const MATERIAL_WHITELIST = [
  'papier', 'feuille', 'carton', 'crayon', 'stylo', 'feutre', 'ciseaux', 'ruban adhésif',
  'balle', 'objet à lancer', 'boule de papier', 'coussin', 'couverture', 'chaise',
  'cuillère', 'ustensile', 'verre', 'gobelet', 'boîte', 'contenant', 'bac', 'panier',
  'minuteur', 'miroir', 'musique', 'lampe de poche', 'vêtement', 'chaussette', 'jouet',
  'nourriture', 'livre', 'téléphone', 'aimant',
];

const ROLE_LABELS: Record<string, Role> = {
  Découvrir: 'decouvrir',
  Pratiquer: 'pratiquer',
  Transférer: 'transferer',
  Ancrer: 'ancrer',
};
const PHASES: Record<string, Phase> = { ANCRER: 'ANCRER', DÉVELOPPER: 'DEVELOPPER', INTÉGRER: 'INTEGRER' };
const PLACES: Record<string, Place> = {
  maison: 'maison', table: 'maison', extérieur: 'exterieur', dehors: 'exterieur', marche: 'exterieur',
  parc: 'exterieur', voiture: 'voiture', partout: 'partout',
};
const ENERGIES: ParentEnergy[] = ['basse', 'moyenne', 'haute'];
const MOVEMENTS: Movement[] = ['assis', 'debout', 'actif'];
const MOMENTS: Record<string, DayMoment> = {
  matin: 'matin', 'après l\'école': 'apres-ecole', soir: 'soir', 'week-end': 'week-end', indifférent: 'indifferent',
};
const MOODS: Record<string, ChildMood> = {
  agité: 'agite', fatigué: 'fatigue', renfrogné: 'renfrogne', disponible: 'disponible', indifférent: 'indifferent',
};
const CAPTURES: CaptureKind[] = [
  'forces', 'choix', 'reve', 'objectif', 'emotion', 'outil', 'mot', 'personnes', 'progres', 'phrase', 'lettre',
];
const UNLOCKS: Unlock[] = ['fiche_identite', 'bilan_mi_parcours', 'boite_a_outils', 'certificat', 'lettre_un_an'];
const DEBRIEF_TAGS: Record<string, DebriefKind> = { vécu: 'vecu', fait: 'fait', ailleurs: 'ailleurs' };
const EXT_KINDS: Record<string, ExtensionKind> = {
  Approfondir: 'approfondir', Ancrer: 'ancrer', Transférer: 'transferer',
};

const WORDS = (s: string) => s.replace(/[«»"“”.,!?:;…—–-]/g, ' ').split(/\s+/).filter(Boolean).length;
const splitDots = (s: string) => s.split(' · ').map((x) => x.trim()).filter(Boolean);

function pillars(raw: string, where: string): PillarCode[] {
  const list = splitDots(raw);
  for (const p of list) if (!/^P[1-8]$/.test(p)) throw new Error(`${where} : pilier inconnu « ${p} »`);
  return list as PillarCode[];
}

function mapList<T>(raw: string, dict: Record<string, T>, where: string, field: string): T[] {
  return splitDots(raw).map((x) => {
    const v = dict[x.toLowerCase()] ?? dict[x];
    if (!v) throw new Error(`${where} : ${field} inconnu « ${x} »`);
    return v;
  });
}

/** Lit les lignes « **Clé :** valeur » d'un bloc. */
function readFields(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of lines) {
    const m = l.match(/^\*\*(.+?) :\*\* (.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function need(fields: Record<string, string>, key: string, where: string): string {
  const v = fields[key];
  if (!v) throw new Error(`${where} : champ « ${key} » manquant`);
  return v;
}

function numbered(lines: string[]): string[] {
  return lines.filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, '').trim());
}
function bullets(lines: string[]): string[] {
  return lines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim());
}
function prose(lines: string[]): string {
  return lines.filter((l) => l && !l.startsWith('**')).join('\n').trim();
}
function quote(lines: string[], where: string): string {
  const q = lines.find((l) => /^«.+»$/.test(l));
  if (!q) throw new Error(`${where} : phrase entre « » attendue`);
  return q;
}

export function parseWeekMarkdown(md: string): { week: P3Week; activities: P3Activity[] } {
  const lines = md.split(/\r?\n/).map((l) => l.trimEnd());

  // ── En-tête de semaine ────────────────────────────────────────────────────
  const h = lines[0]?.match(/^# SEMAINE (\d+) — (.+)$/);
  if (!h) throw new Error('En-tête « # SEMAINE n — titre » manquant');
  const weekNo = Number(h[1]);
  const whereW = `Semaine ${weekNo}`;
  const firstCard = lines.findIndex((l) => l.startsWith('## ACT-'));
  if (firstCard < 0) throw new Error(`${whereW} : aucune fiche`);
  const head = lines.slice(1, firstCard);
  const wf = readFields(head);
  const phase = PHASES[need(wf, 'Phase', whereW)];
  if (!phase) throw new Error(`${whereW} : phase inconnue`);
  const transferRaw = need(wf, 'Transfert', whereW);
  const unlockRaw = need(wf, 'Débloque', whereW);
  if (unlockRaw !== '—' && !UNLOCKS.includes(unlockRaw as Unlock)) {
    throw new Error(`${whereW} : déblocage inconnu « ${unlockRaw} »`);
  }
  const intro: string[] = [];
  let buf: string[] = [];
  for (const l of head) {
    if (!l.startsWith('>')) continue;
    const t = l.replace(/^>\s?/, '');
    if (t === '') {
      if (buf.length) intro.push(buf.join(' '));
      buf = [];
    } else buf.push(t);
  }
  if (buf.length) intro.push(buf.join(' '));

  const week: P3Week = {
    week: weekNo,
    title: h[2],
    phase,
    session_source: need(wf, 'Séance source', whereW),
    action: need(wf, 'Action', whereW),
    skill: need(wf, 'Compétence', whereW),
    pillars: need(wf, 'Piliers', whereW) === 'Tous'
      ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
      : pillars(need(wf, 'Piliers', whereW), whereW),
    opening_line: need(wf, "Phrase d'ouverture", whereW),
    transfer: transferRaw === 'oui',
    unlocks: unlockRaw === '—' ? null : (unlockRaw as Unlock),
    foundation: need(wf, 'Fondement', whereW),
    intro,
    status: need(wf, 'Statut', whereW) as P3Week['status'],
  };
  if (!['brouillon', 'revu', 'publie'].includes(week.status)) throw new Error(`${whereW} : statut inconnu`);

  // ── Fiches ────────────────────────────────────────────────────────────────
  const activities: P3Activity[] = [];
  const starts = lines.map((l, i) => (l.startsWith('## ACT-') ? i : -1)).filter((i) => i >= 0);
  starts.forEach((start, k) => {
    const end = starts[k + 1] ?? lines.length;
    const block = lines.slice(start, end).filter((l) => l !== '---');
    activities.push(parseActivity(block, week));
  });

  if (activities.length !== 3) throw new Error(`${whereW} : ${activities.length} fiches (3 attendues)`);
  return { week, activities };
}

function parseActivity(block: string[], week: P3Week): P3Activity {
  const t = block[0].match(/^## (ACT-(\d{2})(\d{2})) · (.+)$/);
  if (!t) throw new Error(`Titre de fiche illisible : ${block[0]}`);
  const [, id, ww, rr, title] = t;
  const where = id;
  if (Number(ww) !== week.week) throw new Error(`${where} : rangée dans la semaine ${week.week}`);
  const rank = Number(rr) as 1 | 2 | 3;
  if (![1, 2, 3].includes(rank)) throw new Error(`${where} : rang ${rank}`);

  // Découpe en sections ### …
  const sections = new Map<string, string[]>();
  let current = '__head';
  sections.set(current, []);
  for (const l of block.slice(1)) {
    const s = l.match(/^### (.+)$/);
    if (s) {
      current = s[1].trim();
      if (sections.has(current)) throw new Error(`${where} : section « ${current} » en double`);
      sections.set(current, []);
    } else sections.get(current)!.push(l.trim());
  }
  const sec = (name: string) => {
    const s = sections.get(name);
    if (!s) throw new Error(`${where} : section « ${name} » manquante`);
    return s;
  };

  const f = readFields(sections.get('__head')!);
  const role = ROLE_LABELS[need(f, 'Rôle', where)];
  if (!role) throw new Error(`${where} : rôle inconnu`);
  const expectedRole = rank === 1 ? 'decouvrir' : rank === 2 ? 'pratiquer' : week.transfer ? 'transferer' : 'ancrer';
  if (role !== expectedRole) throw new Error(`${where} : rôle « ${role} » au rang ${rank} (attendu ${expectedRole})`);

  // Durées
  const durRaw = need(f, 'Durées', where);
  const native = /\(native\)/.test(durRaw);
  const durations = splitDots(durRaw.replace(/\(native\)/, '')).map(Number) as Duration[];
  if (!durations.length || durations.some((d) => ![10, 20, 30].includes(d))) {
    throw new Error(`${where} : durées illisibles « ${durRaw} »`);
  }
  if (!native && durations[0] !== 10) throw new Error(`${where} : une fiche modulaire commence à 10 min`);

  const places = mapList(need(f, 'Lieu', where), PLACES, where, 'lieu');
  const matRaw = need(f, 'Matériel', where);
  const materials = matRaw === 'aucun' ? [] : matRaw.split(',').map((m) => m.trim());
  const specific = materials.some(
    (m) => !MATERIAL_WHITELIST.some((w) => m.toLowerCase().includes(w)),
  );
  const car_ok = places.includes('voiture');
  if (car_ok && materials.length) throw new Error(`${where} : une fiche voiture ne demande aucun matériel`);

  const energy = need(f, 'Énergie parent', where) as ParentEnergy;
  if (!ENERGIES.includes(energy)) throw new Error(`${where} : énergie inconnue`);
  const movement = need(f, 'Mouvement', where) as Movement;
  if (!MOVEMENTS.includes(movement)) throw new Error(`${where} : mouvement inconnu`);

  const pl = pillars(need(f, 'Piliers', where), where);
  if (pl.length < 1 || pl.length > 3) throw new Error(`${where} : 1 pilier principal + 0 à 2 secondaires`);

  const captureRaw = need(f, 'À garder', where);
  let capture: P3Activity['capture'] = null;
  if (captureRaw !== '—') {
    const m = captureRaw.match(/^(\S+) — (.+)$/);
    if (!m || !CAPTURES.includes(m[1] as CaptureKind)) throw new Error(`${where} : « À garder » illisible`);
    capture = { kind: m[1] as CaptureKind, label: m[2] };
  }

  // Amorce
  const opener = quote(sec('Ce que vous dites pour commencer'), where);
  if (WORDS(opener.replace('{duree}', 'dix minutes')) > 22) throw new Error(`${where} : amorce > 20 mots`);

  // Déroulé et écran
  const steps = numbered(sec('Le déroulé'));
  if (steps.length < 3 || steps.length > 5) throw new Error(`${where} : ${steps.length} étapes (3 à 5)`);
  const screen = numbered(sec("À l'écran"));
  if (screen.length !== steps.length) throw new Error(`${where} : ${screen.length} écrans pour ${steps.length} étapes`);
  screen.forEach((s, i) => {
    if (WORDS(s) > 10) throw new Error(`${where} : écran ${i + 1} dépasse 10 mots (« ${s} »)`);
  });

  const donts = bullets(sec('À éviter'));
  if (donts.length !== 3) throw new Error(`${where} : ${donts.length} interdits (exactement 3)`);

  const see = prose(sec('Ce que vous allez voir'));
  if (!see) throw new Error(`${where} : « Ce que vous allez voir » vide`);

  // Débrief
  const debrief = numbered(sec('Le débrief')).map((q) => {
    const m = q.match(/^\[(.+?)\] (.+)$/);
    const kind = m && DEBRIEF_TAGS[m[1]];
    if (!m || !kind) throw new Error(`${where} : question de débrief sans étiquette [vécu|fait|ailleurs]`);
    return { kind, question: m[2] };
  });
  if (debrief.length < 1 || debrief.length > 3) throw new Error(`${where} : 1 à 3 questions de débrief`);
  const hasTransfer = debrief.some((d) => d.kind === 'ailleurs');
  if (!week.transfer && hasTransfer) {
    throw new Error(`${where} : pas de question de transfert en semaine ${week.week} (Méthode, S1)`);
  }
  if (week.transfer && !hasTransfer) {
    throw new Error(`${where} : la question [ailleurs] est obligatoire dès la semaine 2`);
  }
  const order = debrief.map((d) => ['vecu', 'fait', 'ailleurs'].indexOf(d.kind));
  if (order.some((v, i) => i > 0 && v <= order[i - 1])) throw new Error(`${where} : ordre vécu → fait → ailleurs`);

  const closing = quote(sec('Pour finir'), where);

  // Pourquoi ça marche
  const why = sec('Pourquoi ça marche');
  const wf = readFields(why);
  const whyOne = why.find((l) => l && !l.startsWith('**') && !l.startsWith('- '));
  if (!whyOne) throw new Error(`${where} : ligne « pourquoi » manquante`);
  const sources: SourceRef[] = bullets(why).map((s) => {
    const m = s.match(/^(.+) — Niveau ([ABC])$/);
    if (!m) throw new Error(`${where} : source sans niveau « ${s} »`);
    return { citation: m[1].trim(), level: m[2] as 'A' | 'B' | 'C' };
  });
  if (!sources.length) throw new Error(`${where} : au moins une source`);

  // Extensions : une par palier de durée au-delà du socle
  const extensions: P3Activity['extensions'] = [];
  for (const [name, lines] of sections) {
    const m = name.match(/^\+10 min — (.+)$/);
    if (!m) continue;
    const kind = EXT_KINDS[m[1]];
    if (!kind) throw new Error(`${where} : extension inconnue « ${m[1]} »`);
    const adds_to = (durations[0] + 10 * (extensions.length + 1)) as 20 | 30;
    extensions.push({ adds_to, kind, text: prose(lines) });
  }
  if (extensions.length !== durations.length - 1) {
    throw new Error(`${where} : ${extensions.length} extensions pour les durées ${durations.join('/')}`);
  }

  const variants: P3Activity['variants'] = (['12-14', '15-17'] as const).map((band) => {
    const lines = sec(`Variante ${band.replace('-', '–')}`);
    const vf = readFields(lines);
    const vo = vf['Amorce'] ?? null;
    if (vo && !/^«.+»$/.test(vo)) throw new Error(`${where} : amorce de variante ${band} sans « »`);
    return { band, opener: vo, text: prose(lines) };
  });

  const fails = prose(sec('Pourquoi ça rate'));
  if (!fails) throw new Error(`${where} : « Pourquoi ça rate » vide`);

  return {
    id,
    week: week.week,
    rank,
    role,
    phase: week.phase,
    title,
    subtitle: need(f, 'Sous-titre', where),
    objective: need(f, 'Objectif', where),
    durations,
    duration_type: native ? 'native' : 'modulaire',
    base_duration: durations[0],
    age_bands: ['8-11', '12-14', '15-17'],
    places,
    car_ok,
    materials,
    specific_materials: specific,
    parent_energy: energy,
    movement,
    moments: mapList(need(f, 'Moment', where), MOMENTS, where, 'moment'),
    child_moods: mapList(need(f, 'Humeur enfant', where), MOODS, where, 'humeur'),
    anti_refusal: need(f, 'Anti-refus', where) === 'oui',
    pillar_main: pl[0],
    pillars_secondary: pl.slice(1),
    capture,
    origin: need(f, 'Origine', where),
    opener,
    opener_is_dynamic: opener.includes('{duree}'),
    steps,
    screen_steps: screen,
    donts: donts as [string, string, string],
    what_you_will_see: see,
    debrief,
    closing,
    why_one_line: whyOne,
    why_detail: need(wf, 'Le détail', where),
    method_ref: need(wf, 'Méthode', where),
    sources,
    extensions,
    variants,
    why_it_fails: fails,
    status: week.status,
  };
}
