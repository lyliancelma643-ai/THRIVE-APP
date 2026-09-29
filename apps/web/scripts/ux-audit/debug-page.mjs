// Diagnostic ponctuel : ouvre un écran avec une persona et journalise les
// appels au backend simulé.  node scripts/ux-audit/debug-page.mjs <persona> <chemin>
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { startMockSupabase } from './mock/server.mjs';
import { NOW, PASSWORD, PERSONAS } from './mock/fixtures.mjs';

const [role, target] = process.argv.slice(2);
const mock = await startMockSupabase({ port: 54321 });
const next = spawn('npx', ['--no-install', 'next', 'start', '-p', '3300', '-H', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 60; i++) {
  try { if ((await fetch('http://127.0.0.1:3300/login')).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 1280, height: 800 } });
await ctx.clock.setFixedTime(NOW);
const page = await ctx.newPage();
page.on('response', async (r) => {
  if (!r.url().includes('54321')) return;
  let body = '';
  try { body = (await r.text()).slice(0, 160); } catch {}
  console.log(r.status(), r.request().method(), r.url().replace('http://127.0.0.1:54321', '').slice(0, 120), body);
});
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text().slice(0, 200)));
const p = PERSONAS[role];
await page.goto('http://127.0.0.1:3300/login');
await page.fill('input[type=email]', p.email);
await page.fill('input[type=password]', PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith('/login'));
console.log('--- navigation', target);
await page.goto(`http://127.0.0.1:3300${target}`);
await page.waitForTimeout(4000);
await page.screenshot({ path: '/tmp/claude-0/-home-user-THRIVE-APP/e9b2685e-c5a5-51c4-9a78-1170ecc9c3ca/scratchpad/crops/debug.png' });
await browser.close();
try { process.kill(-next.pid, 'SIGTERM'); } catch { next.kill(); }
await mock.close();
