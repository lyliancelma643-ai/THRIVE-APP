#!/usr/bin/env node
// Banc de comparaison GO 5 : écrans de l'app (banc DEV /__ecran) ↔ maquettes V4 (Lin) et V5 (Veillée).
//   node scripts/design/compare-ecrans.mjs <port> [lettre…]      ex. : node scripts/design/compare-ecrans.mjs 8091 K G11 M16b
// Sans lettre : toutes les lettres des chapitres (constante CH de maquettes-ios27/screens-final.js).
// Prérequis : `cd apps/mobile && npx expo start --web --port <port>` lancé (Playwright + chromium déjà installés).
// Sorties (docs/release/go5-captures/) :
//   ref/<lettre>-<style>.png  maquette seule, générée depuis maquettes-ios27/v4.html | v5.html (NON versionné)
//   app/<lettre>-<style>.png  app seule, capturée sur /__ecran?e=<lettre>&s=<style> (NON versionné)
//   <lettre>-<style>.png      comparaison, maquette à gauche, app à droite (≤ 600 Ko)
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pnpm = join(root, 'node_modules/.pnpm');
const pkg = (re) => readdirSync(pnpm).find((d) => re.test(d));
const { chromium } = await import(join(pnpm, pkg(/^playwright@/), 'node_modules/playwright/index.mjs'));
const sharp = createRequire(join(pnpm, pkg(/^sharp@/), 'node_modules/'))('sharp');

const [port, ...argIds] = process.argv.slice(2);
if (!port || !/^\d+$/.test(port)) {
  console.error('usage : compare-ecrans.mjs <port> [lettre…]   (sans lettre : toutes celles de CH)');
  process.exit(2);
}

const STYLES = [['v4', 'lin'], ['v5', 'veillee']]; // [fichier maquette, style de l'app]
const W = 402;
const H_MIN = 874;
const MAX_BYTES = 600 * 1024;
const OUT = join(root, 'docs/release/go5-captures');
const REF = join(OUT, 'ref');
const APP = join(OUT, 'app');
for (const d of [OUT, REF, APP]) mkdirSync(d, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });

// ── Références : une page par maquette, une capture par .shot[data-l] .phone ──────────────────
const loadMaquette = async (v) => {
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(root, `maquettes-ios27/${v}.html`)).href, { waitUntil: 'load' });
  // Inter + Fraunces (Google Fonts) : on force leur chargement puis on attend la fin.
  await page.evaluate(async () => {
    const faces = ['400 16px Inter', '500 16px Inter', '600 16px Inter', '700 16px Inter', '800 16px Inter',
      '400 16px Fraunces', '500 16px Fraunces', '600 16px Fraunces'];
    await Promise.all(faces.map((f) => document.fonts.load(f, 'Aàéèç0123 THRIVE').catch(() => null)));
    await document.fonts.ready;
  });
  const fonts = await page.evaluate(() => ({
    inter: document.fonts.check('600 16px Inter'),
    fraunces: document.fonts.check('500 16px Fraunces'),
  }));
  if (!fonts.inter || !fonts.fraunces) console.warn(`! ${v} : polices non chargées (${JSON.stringify(fonts)}) — réseau Google Fonts ?`);
  await page.waitForTimeout(400); // laisse autoHeights() recalculer les hauteurs après les polices
  return page;
};

const maquettes = {};
for (const [v] of STYLES) maquettes[v] = await loadMaquette(v);

const allIds = await maquettes.v4.evaluate(() => [...document.querySelectorAll('.shot[data-l]')].map((e) => e.dataset.l));
const ids = argIds.length ? argIds : allIds;
if (!argIds.length) console.log(`${ids.length} lettres (toutes celles de CH)`);

const refShot = async (v, id, out) => {
  const loc = maquettes[v].locator(`.shot[data-l="${id}"] .phone`);
  if ((await loc.count()) === 0) return null;
  await loc.first().scrollIntoViewIfNeeded();
  const buf = await loc.first().screenshot({ path: out });
  const m = await sharp(buf).metadata();
  return { buf, height: m.height, width: m.width };
};

// ── App : même largeur 402 pt, hauteur = celle de la maquette (≥ 874) ─────────────────────────
const appPage = await ctx.newPage();
const appShot = async (id, s, height, out) => {
  await appPage.setViewportSize({ width: W, height });
  await appPage.goto(`http://localhost:${port}/__ecran?e=${encodeURIComponent(id)}&s=${s}`, { waitUntil: 'networkidle' });
  await appPage.waitForSelector(`[data-testid="ecran-${id}"]`, { timeout: 20000 });
  await appPage.evaluate(() => document.fonts && document.fonts.ready);
  await appPage.waitForTimeout(900);
  return appPage.screenshot({ path: out });
};

// ── Assemblage : maquette à gauche, app à droite, ≤ 600 Ko ───────────────────────────────────
const compose = async (refBuf, appBuf, h, outPath) => {
  const pad = 16;
  const head = 24;
  const base = sharp({ create: { width: W * 2 + pad * 3, height: h + head + pad * 2, channels: 3, background: '#888888' } });
  const label = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${head}"><text x="0" y="17" font-family="Helvetica,Arial,sans-serif" font-size="13" fill="#fff">${t}</text></svg>`);
  const parts = [
    { input: label('MAQUETTE'), left: pad, top: pad },
    { input: label('APP'), left: pad * 2 + W, top: pad },
    { input: refBuf, left: pad, top: pad + head },
    { input: appBuf, left: pad * 2 + W, top: pad + head },
  ];
  const full = await base.composite(parts).png().toBuffer();
  // Réduit si > 600 Ko : PNG optimisé, puis palette 8 bits, puis réduction d'échelle progressive.
  let out = await sharp(full).png({ compressionLevel: 9 }).toBuffer();
  let scale = 1;
  for (const k of [1, 0.85, 0.72, 0.6, 0.5, 0.4]) {
    if (out.length <= MAX_BYTES) break;
    scale = k;
    let img = sharp(full);
    if (k < 1) img = img.resize({ width: Math.round((W * 2 + pad * 3) * k) });
    out = await img.png({ palette: true, quality: 80, effort: 8, compressionLevel: 9 }).toBuffer();
  }
  writeFileSync(outPath, out);
  return { bytes: out.length, scale };
};

let ok = 0;
let ko = 0;
for (const id of ids) {
  for (const [v, s] of STYLES) {
    try {
      const ref = await refShot(v, id, join(REF, `${id}-${s}.png`));
      if (!ref) { console.log(`- ${id} ${s} : absent de ${v}.html`); continue; }
      const h = Math.min(Math.max(H_MIN, ref.height), 9000);
      const app = await appShot(id, s, h, join(APP, `${id}-${s}.png`));
      const mApp = await sharp(app).metadata();
      const hh = Math.max(ref.height, mApp.height);
      const r = await compose(ref.buf, app, hh, join(OUT, `${id}-${s}.png`));
      const kb = Math.round(r.bytes / 1024);
      console.log(`✓ ${id} ${s} : ${kb} Ko${r.scale < 1 ? ` (échelle ${r.scale.toFixed(2)})` : ''}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${id} ${s} : ${e.message.split('\n')[0]}`);
      ko++;
    }
  }
}
await b.close();
console.log(`${ok} comparaisons, ${ko} échecs → ${OUT}`);
process.exit(ko ? 1 : 0);
