#!/usr/bin/env node
// Régénère les matières de l'app mobile DEPUIS LE CSS DU WEB (apps/web/src/app/globals.css, variables --mat-*),
// en pleine qualité (aucune réduction de palette) et en double résolution (tuile de 160 pt rendue en 320 px).
//   node scripts/design/bake-textures.mjs
//
// Le web mélange feutre, émail et grain en « lumière douce » (background-blend-mode: soft-light). Ce mode n'est pas
// rendu de façon identique partout (WebKit, iOS natif, Android) : les tuiles sont donc PRÉCUITES pour un mélange
// normal — chaque pixel devient du blanc (là où la lumière éclaire) ou du noir (là où elle creuse), avec l'opacité
// qui reproduit l'écart de la lumière douce sur un fond moyen. Résultat : le même relief que le web, la couleur de
// l'élément restant la sienne, sur toutes les plateformes. Papier et grain doux restent en mélange normal.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const store = join(root, 'node_modules/.pnpm');
const sharp = createRequire(join(store, readdirSync(store).find((d) => /^sharp@/.test(d)), 'node_modules/'))('sharp');

const css = readFileSync(join(root, 'apps/web/src/app/globals.css'), 'utf8');
const OUT = join(root, 'apps/mobile/assets/brand/textures');
const SCALE = 2;

/** [fichier, variable CSS, mélange du web] */
const TILES = [
  ['grain', '--mat-grain', 'soft-light'],
  ['grain-soft', '--mat-grain-soft', 'normal'],
  ['felt', '--mat-felt', 'soft-light'],
  ['felt-strong', '--mat-felt-strong', 'soft-light'],
  ['enamel', '--mat-enamel', 'soft-light'],
  ['paper', '--mat-paper', 'normal'],
];

function svgOf(cssVar) {
  const m = new RegExp(`${cssVar}:\\s*url\\("data:image/svg\\+xml;utf8,(.*?)"\\);`).exec(css);
  if (!m) throw new Error(`variable introuvable : ${cssVar}`);
  const svg = decodeURIComponent(m[1].replace(/%25/g, '%25'));
  // 160 × 160 unités → rendu en 320 px (même motif, deux fois plus de pixels).
  return svg.replace("width='160' height='160'", `width='${160 * SCALE}' height='${160 * SCALE}' viewBox='0 0 160 160'`);
}

// Écart de la lumière douce rapporté à un mélange normal (fond marine moyen) : éclaircir ≈ 1/3, assombrir ≈ 0,7.
const LIGHT = 0.33;
const SHADE = 0.7;

const report = [];
for (const [name, cssVar, blend] of TILES) {
  const svg = svgOf(cssVar);
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (blend === 'soft-light') {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255;
      const l = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
      const d = 2 * l - 1;
      const v = d >= 0 ? 255 : 0;
      const alpha = d >= 0 ? a * d * LIGHT : a * -d * SHADE;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  const file = join(OUT, `${name}.png`);
  await sharp(data, { raw: info }).png({ compressionLevel: 9, effort: 10 }).toFile(file);
  report.push(`${name}.png  ${info.width}x${info.height}  ${statSync(file).size} o  (${blend === 'soft-light' ? 'lumière douce précuite' : 'normal'})`);
}
console.log(report.join('\n'));
