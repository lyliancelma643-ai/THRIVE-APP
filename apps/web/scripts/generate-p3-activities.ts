// Régénère le contenu P3 à partir des 13 fichiers markdown.
//   pnpm --filter web exec tsx scripts/generate-p3-activities.ts
// Sorties :
//   src/lib/p3-moments/activities.generated.json  ← servi à l'app
//   src/content/p3-moments/_export/activities.csv  ← relecture tableur / import CMS
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWeekMarkdown } from '../src/lib/p3-moments/parse';
import { P3ContentSchema } from '../../../packages/shared/src/validation/p3Activity.schema';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'src/content/p3-moments');
const files = readdirSync(contentDir).filter((f) => /^semaine-\d{2}\.md$/.test(f)).sort();

const parsed = files.map((f) => parseWeekMarkdown(readFileSync(path.join(contentDir, f), 'utf8')));
const content = {
  version: '1.0.0-v1-8-17',
  weeks: parsed.map((p) => p.week),
  activities: parsed.flatMap((p) => p.activities),
};
P3ContentSchema.parse(content);

writeFileSync(
  path.join(root, 'src/lib/p3-moments/activities.generated.json'),
  JSON.stringify(content, null, 2) + '\n',
);

// CSV à plat (une ligne par fiche) — séparateur « ; », listes jointes par « | »
const cols: [string, (a: (typeof content.activities)[number]) => string][] = [
  ['id', (a) => a.id],
  ['semaine', (a) => String(a.week)],
  ['rang', (a) => String(a.rank)],
  ['role', (a) => a.role],
  ['phase', (a) => a.phase],
  ['titre', (a) => a.title],
  ['sous_titre', (a) => a.subtitle],
  ['objectif', (a) => a.objective],
  ['durees', (a) => a.durations.join('|')],
  ['lieux', (a) => a.places.join('|')],
  ['voiture', (a) => (a.car_ok ? 'oui' : 'non')],
  ['materiel', (a) => a.materials.join('|') || 'aucun'],
  ['energie_parent', (a) => a.parent_energy],
  ['mouvement', (a) => a.movement],
  ['moments', (a) => a.moments.join('|')],
  ['humeurs', (a) => a.child_moods.join('|')],
  ['anti_refus', (a) => (a.anti_refusal ? 'oui' : 'non')],
  ['pilier', (a) => a.pillar_main],
  ['piliers_secondaires', (a) => a.pillars_secondary.join('|')],
  ['a_garder', (a) => (a.capture ? `${a.capture.kind}: ${a.capture.label}` : '')],
  ['amorce', (a) => a.opener],
  ['deroule', (a) => a.steps.join(' | ')],
  ['ecran', (a) => a.screen_steps.join(' | ')],
  ['a_eviter', (a) => a.donts.join(' | ')],
  ['ce_que_vous_allez_voir', (a) => a.what_you_will_see],
  ['debrief', (a) => a.debrief.map((d) => `[${d.kind}] ${d.question}`).join(' | ')],
  ['pour_finir', (a) => a.closing],
  ['pourquoi', (a) => a.why_one_line],
  ['sources', (a) => a.sources.map((s) => `${s.citation} (${s.level})`).join(' | ')],
  ['origine', (a) => a.origin],
  ['statut', (a) => a.status],
];
const esc = (v: string) => `"${v.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
const csv = [cols.map(([h]) => h).join(';'), ...content.activities.map((a) => cols.map(([, f]) => esc(f(a))).join(';'))].join('\n');
mkdirSync(path.join(contentDir, '_export'), { recursive: true });
writeFileSync(path.join(contentDir, '_export/activities.csv'), '﻿' + csv + '\n');

console.log(`${content.activities.length} fiches · ${content.weeks.length} semaines · JSON + CSV régénérés`);
