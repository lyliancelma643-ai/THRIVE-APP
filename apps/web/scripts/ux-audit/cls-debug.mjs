// Diagnostic CLS : sources des décalages de mise en page d'un écran.
//   node scripts/ux-audit/cls-debug.mjs <persona> <largeur>x<hauteur> <chemin> [<chemin>…]
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { startMockSupabase } from './mock/server.mjs';
import { NOW, PASSWORD, PERSONAS } from './mock/fixtures.mjs';

const [role, size, ...targets] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const mock = await startMockSupabase({ port: 54321 });
const next = spawn('npx', ['--no-install', 'next', 'start', '-p', '3300', '-H', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch('http://127.0.0.1:3300/login')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const touch = width < 1100;
const ctx = await browser.newContext({ bypassCSP: true, viewport: { width, height }, hasTouch: touch, isMobile: width < 700, locale: 'fr-CA', timezoneId: 'America/Toronto' });
await ctx.clock.setFixedTime(NOW);
await ctx.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        t: Math.round(e.startTime),
        v: +e.value.toFixed(4),
        src: (e.sources || []).map((s) => {
          const n = s.node;
          const d = n ? (n.nodeType === 1 ? `${n.tagName.toLowerCase()}.${[...n.classList].slice(0, 5).join('.')}` : `#text "${n.textContent.slice(0, 30)}"`) : '?';
          return `${d} ${JSON.stringify([s.previousRect.y, s.previousRect.height])}→${JSON.stringify([s.currentRect.y, s.currentRect.height])}`;
        }),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
});
const page = await ctx.newPage();
if (role !== 'public') {
  const p = PERSONAS[role];
  await page.goto('http://127.0.0.1:3300/login');
  await page.fill('input[type=email]', p.email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
}
for (const t of targets) {
  await page.goto('http://127.0.0.1:3300' + t, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2500);
  const s = await page.evaluate(() => window.__shifts);
  console.log(`\n== ${t}  total=${s.reduce((a, b) => a + b.v, 0).toFixed(3)}`);
  for (const x of s) console.log(x.t, x.v, '\n   ' + x.src.join('\n   '));
}
await browser.close();
try { process.kill(-next.pid); } catch {}
await mock.close();
