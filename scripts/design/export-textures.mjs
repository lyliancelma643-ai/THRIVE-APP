#!/usr/bin/env node
// Exporte les matières de maquettes-ios27/final.css (variables --mat-*) en petites tuiles PNG à répéter
// dans l'app mobile : apps/mobile/assets/brand/textures/*.png (≤ 20 Ko chacune, palette indexée avec alpha).
//   node scripts/design/export-textures.mjs
// Prérequis : chromium de Playwright déjà installé (cache ms-playwright) ; sharp (présent dans le store pnpm).
// Les tuiles sont rendues par le navigateur à partir du CSS même (aucune valeur recopiée à la main).
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const store = join(root, 'node_modules/.pnpm');
const pick = (re) => readdirSync(store).find((d) => re.test(d));
const { chromium } = await import(join(store, pick(/^playwright@/), 'node_modules/playwright/index.mjs'));
const sharp = createRequire(join(store, pick(/^sharp@/), 'node_modules/'))('sharp');

const css = readFileSync(join(root, 'maquettes-ios27/final.css'), 'utf8');
const OUT = join(root, 'apps/mobile/assets/brand/textures');
mkdirSync(OUT, { recursive: true });
const MAX_BYTES = 20 * 1024;

// nom du fichier, variable CSS, taille de la tuile (px = pt de la maquette 402 pt).
const TILES = [
  ['grain', '--mat-grain', 160, 160],
  ['grain-soft', '--mat-grain-soft', 160, 160],
  ['felt', '--mat-felt', 160, 160],
  ['felt-strong', '--mat-felt-strong', 160, 160],
  ['enamel', '--mat-enamel', 160, 160],
  ['paper', '--mat-paper', 160, 160],
  ['linen', '--mat-linen', 3, 3],
  ['laid', '--mat-laid', 30, 4],
  ['ribs', '--mat-ribs', 6, 6],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const report = [];
for (const [name, cssVar, w, h] of TILES) {
  const html = `<!doctype html><meta charset="utf-8"><style>${css}
    html,body{margin:0;background:transparent} #t{width:${w}px;height:${h}px;background-image:var(${cssVar});background-repeat:no-repeat;background-size:${w}px ${h}px}
  </style><div id="t"></div>`;
  await page.setContent(html);
  await page.waitForTimeout(150);
  const raw = await page.locator('#t').screenshot({ omitBackground: true });
  let out = null;
  for (const colours of [64, 32, 24, 16, 8]) {
    const buf = await sharp(raw).png({ palette: true, colours, compressionLevel: 9, effort: 10, dither: 0.5 }).toBuffer();
    out = buf;
    if (buf.length <= MAX_BYTES) break;
  }
  await sharp(out).toFile(join(OUT, `${name}.png`));
  const size = statSync(join(OUT, `${name}.png`)).size;
  report.push(`${name}.png  ${w}x${h}  ${size} o`);
  if (size > MAX_BYTES) { console.error(`TROP LOURD : ${name}.png (${size} o)`); process.exitCode = 1; }
}
await browser.close();
console.log(report.join('\n'));
