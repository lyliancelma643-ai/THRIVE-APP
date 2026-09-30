// Parcours du mode activité Maison, capture à chaque étape (diagnostic UX).
//   node scripts/ux-audit/flow-maison.mjs <sortie> [largeur]x[hauteur]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { startMockSupabase } from './mock/server.mjs';
import { NOW, PASSWORD, PERSONAS } from './mock/fixtures.mjs';

const [out = 'ux-audit/flow', size = '393x852'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
mkdirSync(out, { recursive: true });
const mock = await startMockSupabase({ port: 54321 });
const next = spawn('npx', ['--no-install', 'next', 'start', '-p', '3300', '-H', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch('http://127.0.0.1:3300/login')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ bypassCSP: true, viewport: { width, height }, hasTouch: width < 1100, isMobile: width < 700, deviceScaleFactor: 1, locale: 'fr-CA', timezoneId: 'America/Toronto' });
await ctx.clock.setFixedTime(NOW);
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3300/login');
await page.fill('input[type=email]', PERSONAS['parent-performance'].email);
await page.fill('input[type=password]', PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
await page.goto('http://127.0.0.1:3300/parent/fitness/ACT-0301/moment?duree=10&lieu=maison');
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(1200);
let n = 0;
const shot = async (label) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}-${label}.png` });
};
await shot('checkin');
// Clique successivement sur la première option de chaque question du check-in.
// Les questions apparaissent une à une.
for (let i = 0; i < 3; i++) {
  await page.locator('fieldset').nth(i).locator('button').nth(1).click().catch(() => {});
  await page.waitForTimeout(400);
}
await shot('checkin-rempli');
// Avance en cliquant, à chaque écran, le premier bouton d'action trouvé.
const NEXT = ['C’est lu', 'C’est dit, on commence', 'Suivant', 'Terminer l’activité', 'Question suivante', 'C’est dit', 'Garder ce moment', 'C’est noté', 'Continuer', 'Terminer'];
for (let step = 0; step < 30; step++) {
  let clicked = null;
  for (const label of NEXT) {
    const b = page.getByRole('button', { name: label, exact: true }).first();
    if ((await b.count()) && (await b.isVisible().catch(() => false))) {
      await b.click().catch(() => {});
      clicked = label;
      break;
    }
  }
  if (!clicked) break;
  await shot(clicked.replace(/[^a-zA-Zàâçéèêëîïôûùüÿœ]+/g, '-').toLowerCase());
}
await browser.close();
try { process.kill(-next.pid); } catch {}
await mock.close();
