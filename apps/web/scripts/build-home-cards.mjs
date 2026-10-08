// Régénère src/lib/home-cards/cards.generated.json depuis le fichier maître
// (src/content/a-la-maison/paquet-*.md). À relancer après toute modification
// du contenu : `pnpm --filter web cards:build`. Le test home-cards.test.ts
// échoue si le JSON n'est plus synchronisé avec le markdown.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeckMarkdown } from '../src/lib/home-cards/parse.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const decks = {};
const cards = [];

for (const deck of ['a', 'b', 'c']) {
  const md = readFileSync(join(root, `src/content/a-la-maison/paquet-${deck}.md`), 'utf8');
  const parsed = parseDeckMarkdown(md);
  decks[parsed.info.deck] = parsed.info;
  cards.push(...parsed.cards);
}

const out = join(root, 'src/lib/home-cards/cards.generated.json');
writeFileSync(out, JSON.stringify({ decks, cards }, null, 2) + '\n');
console.log(`${cards.length} cartes écrites dans ${out}`);
