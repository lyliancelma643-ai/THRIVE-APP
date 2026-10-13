#!/usr/bin/env node
// Compare les écrans de l'app (banc DEV /__ecran) au canevas Claude Design, côte à côte.
//   node scripts/design/compare-ecrans.mjs <port> <ID> [ID…]       ex. : node scripts/design/compare-ecrans.mjs 8091 K K2 L
// Prérequis : `cd apps/mobile && npx expo start --web --port <port>` lancé ; captures de référence générées
// dans docs/design/claude-design-ios27/reference{,-long}/ (voir INDEX.md).
// Sortie : docs/design/claude-design-ios27/integration/<ID>-<style>.png (gauche = maquette, droite = app),
// et pour les écrans longs <ID>-<style>-long.png (pleine hauteur des deux côtés).
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pw = readdirSync(join(root, 'node_modules/.pnpm')).find((d) => /^playwright@/.test(d));
const { chromium } = await import(join(root, 'node_modules/.pnpm', pw, 'node_modules/playwright/index.mjs'));

const [port, ...ids] = process.argv.slice(2);
if (!port || ids.length === 0) { console.error('usage : compare-ecrans.mjs <port> <ID…>'); process.exit(2); }
const D = join(root, 'docs/design/claude-design-ios27');
const OUT = join(D, 'integration'); mkdirSync(OUT, { recursive: true });
const STYLES = [['v1', 'natif'], ['v2', 'nuit'], ['v3', 'carnet']];
const refFor = (v, id, long) => {
  const dir = join(D, long ? 'reference-long' : 'reference');
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.startsWith(`${v.toUpperCase()}-${id}-`));
  return f ? join(dir, f) : null;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const shot = async (id, s, long) => {
  await p.setViewportSize({ width: 402, height: 874 });
  await p.goto(`http://localhost:${port}/__ecran?e=${encodeURIComponent(id)}&s=${s}`, { waitUntil: 'networkidle' });
  await p.waitForSelector(`[data-testid="ecran-${id}"]`, { timeout: 20000 });
  await p.waitForTimeout(900);
  if (!long) return p.screenshot();
  // Pleine hauteur : agrandit la fenêtre à la hauteur du plus grand contenu défilant.
  const h = await p.evaluate(() => Math.max(874, ...[...document.querySelectorAll('div')].map((d) => d.scrollHeight)));
  await p.setViewportSize({ width: 402, height: Math.min(h, 9000) });
  await p.waitForTimeout(600);
  return p.screenshot();
};
const sideBySide = async (refPath, appBuf, outPath) => {
  const q = await b.newPage();
  const ref = refPath ? `data:image/png;base64,${(await import('node:fs')).readFileSync(refPath).toString('base64')}` : '';
  const app = `data:image/png;base64,${appBuf.toString('base64')}`;
  await q.setContent(`<body style="margin:0;display:flex;gap:16px;background:#888;align-items:flex-start;font:12px sans-serif">
    <div><div style="color:#fff;padding:4px">MAQUETTE</div>${ref ? `<img src="${ref}">` : '<div style="width:402px;color:#fff">(pas de référence)</div>'}</div>
    <div><div style="color:#fff;padding:4px">APP</div><img src="${app}"></div></body>`);
  await q.waitForTimeout(150);
  await q.screenshot({ path: outPath, fullPage: true });
  await q.close();
};

for (const id of ids) {
  for (const [v, s] of STYLES) {
    try {
      await sideBySide(refFor(v, id, false), await shot(id, s, false), join(OUT, `${id}-${s}.png`));
      const refLong = refFor(v, id, true);
      if (refLong) await sideBySide(refLong, await shot(id, s, true), join(OUT, `${id}-${s}-long.png`));
      console.log(`✓ ${id} ${s}`);
    } catch (e) {
      console.log(`✗ ${id} ${s} : ${e.message.split('\n')[0]}`);
    }
  }
}
await b.close();
