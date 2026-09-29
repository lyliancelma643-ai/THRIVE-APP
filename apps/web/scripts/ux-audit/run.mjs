// ─────────────────────────────────────────────────────────────────────────────
// Audit visuel automatisé THRIVE — captures + contrôles sur tous les formats.
//
//   node scripts/ux-audit/build-mock.mjs          # une fois par version du code
//   node scripts/ux-audit/run.mjs --out before    # ou after
//
// Options : --out <dossier>  --quick (4 viewports)  --viewports a,b
//           --roles a,b  --screens a,b  --no-axe  --workers N  --engine webkit
//
// Pour chaque capture : débordement horizontal, cibles tactiles < 44 px,
// champs < 16 px (formats tactiles), images sans alt / sans dimensions,
// axe-core (WCAG 2.2 AA) et CLS au chargement des écrans principaux.
// Sorties : ux-audit/<out>/<viewport>/<rôle>/<écran>.png + report.json + summary.md
//
// WebKit : utilisé si installé (--engine webkit). Sinon Chromium émule
// iPhone / iPad (viewport, densité, tactile, user-agent Safari).
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startMockSupabase } from './mock/server.mjs';
import { NOW, PASSWORD, PERSONAS } from './mock/fixtures.mjs';
import { AXE_VIEWPORTS, QUICK, SCREENS, VIEWPORTS } from './screens.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const repo = path.resolve(webDir, '../..');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const list = (name) => opt(name, '')?.split(',').filter(Boolean) ?? [];

const OUT = path.join(repo, 'ux-audit', opt('out', 'before'));
const PORT = Number(opt('port', 3200));
const BASE = `http://127.0.0.1:${PORT}`;
const WORKERS = Number(opt('workers', 4));
const ENGINE = opt('engine', 'chromium');

let viewports = VIEWPORTS;
if (flag('quick')) viewports = VIEWPORTS.filter((v) => QUICK.includes(v.id));
if (list('viewports').length) viewports = VIEWPORTS.filter((v) => list('viewports').includes(v.id));
let screens = SCREENS;
if (list('roles').length) screens = screens.filter((s) => list('roles').includes(s.role));
if (list('screens').length) screens = screens.filter((s) => list('screens').includes(s.id));

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
};

function contextOptions(vp) {
  const ua = vp.id === 'android' ? UA.android : vp.tablet ? UA.ipad : vp.touch ? UA.iphone : undefined;
  return {
    viewport: { width: vp.w, height: vp.h },
    // Densité 1 pour les captures (poids raisonnable) : la mise en page CSS est identique.
    deviceScaleFactor: 1,
    isMobile: ENGINE === 'chromium' ? vp.touch && !vp.tablet : undefined,
    hasTouch: vp.touch,
    userAgent: ua,
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    // Le backend simulé est en http://127.0.0.1 : la CSP de prod (https://*.supabase.co)
    // le bloquerait. Seul le chargement des ressources est concerné, pas le rendu.
    bypassCSP: true,
    serviceWorkers: 'block',
  };
}

// ── Serveurs ─────────────────────────────────────────────────────────────────
async function waitHttp(url, ms = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Serveur injoignable : ${url}`);
}

async function startNext() {
  if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) throw new Error('Pas de build : lance d’abord scripts/ux-audit/build-mock.mjs');
  const child = spawn('npx', ['--no-install', 'next', 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: webDir,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Groupe de processus propre : l'arret emporte aussi next-server.
    detached: true,
  });
  child.stderr.on('data', (d) => process.stderr.write(`[next] ${d}`));
  await waitHttp(`${BASE}/login`);
  if (child.exitCode !== null) throw new Error(`Next ne demarre pas (port ${PORT} occupe ?)`);
  return child;
}

// ── Contrôles exécutés dans la page ──────────────────────────────────────────
function pageChecks({ touch }) {
  const vw = window.innerWidth;
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const txt = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}${txt ? ` « ${txt} »` : ''}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01;
  };
  const clippedByScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return true;
    }
    return false;
  };

  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const overflow = [];
  if (docW > vw + 1) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && !clippedByScroller(el)) overflow.push(describe(el));
      if (overflow.length >= 6) break;
    }
  }

  const small = [];
  const smallInputs = [];
  if (touch) {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=radio], [role=switch], [tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(el);
      // Exception WCAG 2.5.8 : lien dans une phrase.
      if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN)$/.test(el.parentElement.tagName)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.closest('label')) continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) small.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select')) {
      if (!visible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) smallInputs.push(`${describe(el)} ${fs}px`);
    }
  }

  const images = [];
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) images.push(`sans alt : ${img.src.slice(-60)}`);
    const sized = img.hasAttribute('width') && img.hasAttribute('height');
    const cs = getComputedStyle(img);
    const boxed = cs.position === 'absolute' || cs.aspectRatio !== 'auto' || (img.parentElement && getComputedStyle(img.parentElement).aspectRatio !== 'auto') || (cs.height.endsWith('px') && img.style.height);
    if (!sized && !boxed && !/(^|\s)(w|h)-/.test(img.className)) images.push(`sans dimensions : ${img.src.slice(-60)}`);
  }

  return {
    docWidth: docW,
    overflow,
    smallTargets: small.slice(0, 40),
    smallTargetsCount: small.length,
    smallInputs,
    images,
    cls: Math.round((window.__cls ?? 0) * 1000) / 1000,
  };
}

const INIT = ({ ambiance, welcome }) => {
  try {
    localStorage.setItem('thrive-ambiance', JSON.stringify({ state: { ambiance }, version: 0 }));
    if (welcome === false) localStorage.removeItem('thrive.p3.welcomeSeen');
    else localStorage.setItem('thrive.p3.welcomeSeen', 'true');
  } catch {
    /* stockage indisponible */
  }
  window.__cls = 0;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* API absente */
  }
};

// ── Actions avant capture ────────────────────────────────────────────────────
async function clickFirst(page, selectors) {
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if (await loc.count()) {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 4000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

const ACTIONS = {
  'signup-tab': (p) => clickFirst(p, ['button:has-text("Créer un compte")']),
  forgot: (p) => clickFirst(p, ['button:has-text("Mot de passe oublié")']),
  'bilan-detail': (p) => clickFirst(p, ['[data-info="objectif"]', '[data-info="boite"]', '[data-info="identite"]']),
  'bilan-passport': (p) => clickFirst(p, ['[data-action="edit-passport"]']),
  'user-menu': (p) => clickFirst(p, ['[aria-label="Menu du compte"]']),
  'child-menu': (p) => clickFirst(p, ['[aria-label="Changer d\'enfant"]', '[aria-label^="Changer"]']),
  notifications: (p) => clickFirst(p, ['button[aria-label^="Notifications"]']),
  'open-session-bilan': (p) => clickFirst(p, ['button[aria-pressed="false"]:not([disabled])']),
  'field-mode': (p) => clickFirst(p, ['button:has-text("Mode Terrain")', 'button:has-text("mode terrain")', 'button:has-text("Terrain")']),
};

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page
    .waitForFunction(() => !document.querySelector('.animate-pulse, [aria-busy="true"]'), null, { timeout: 8000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
}

// ── Principal ────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log('· démarrage du backend simulé');
  const mock = await startMockSupabase({ port: 54321 });
  console.log('· démarrage de Next');
  const next = await startNext();
  console.log('· lancement du navigateur');
  const engine = ENGINE === 'webkit' ? webkit : chromium;
  const browser = await engine.launch(ENGINE === 'chromium' ? { executablePath: '/opt/pw-browsers/chromium' } : {});

  // Connexion une fois par persona (par le vrai formulaire), état réutilisé ensuite.
  const states = {};
  for (const role of new Set(screens.map((s) => s.role))) {
    if (role === 'public') continue;
    const persona = PERSONAS[role];
    const ctx = await browser.newContext({ ...contextOptions(VIEWPORTS.find((v) => v.id === 'desktop')) });
    await ctx.clock.setFixedTime(NOW);
    const page = await ctx.newPage();
    console.log(`· connexion ${role}…`);
    await page.goto(`${BASE}/login`);
    await page.fill('input[type=email]', persona.email);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
    await settle(page);
    states[role] = await ctx.storageState();
    await ctx.close();
    console.log(`✓ connexion ${role}`);
  }

  // --resume : on garde les captures réussies d'un passage précédent.
  const previous = [];
  const reportPath = path.join(OUT, 'report.json');
  if (flag('resume') && existsSync(reportPath)) {
    const old = JSON.parse(readFileSync(reportPath, 'utf8'));
    previous.push(...old.results.filter((r) => !r.error));
  }
  const doneKey = new Set(previous.map((r) => `${r.role}|${r.screen}|${r.viewport}`));
  const tasks = [];
  for (const s of screens)
    for (const vp of viewports)
      for (const amb of s.ambiances ?? ['night']) {
        const key = `${s.role}|${s.id}${amb === 'day' ? '-jour' : ''}|${vp.id}`;
        if (!doneKey.has(key)) tasks.push({ s, vp, amb });
      }
  console.log(`${tasks.length} captures · ${viewports.length} viewports · ${screens.length} écrans`);

  const results = [...previous];
  let done = 0;
  const run = async ({ s, vp, amb }) => {
    const ctx = await browser.newContext({ ...contextOptions(vp), storageState: states[s.role] });
    await ctx.clock.setFixedTime(NOW);
    await ctx.addInitScript(INIT, { ambiance: amb, welcome: s.welcome });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', (e) => {
      // Service worker bloqué pendant l'audit : l'enregistrement Serwist échoue, sans rapport avec l'UI.
      if (/reading 'waiting'/.test(e.message)) return;
      consoleErrors.push(String(e.message).slice(0, 200));
    });
    const name = `${s.id}${amb === 'day' ? '-jour' : ''}`;
    const file = path.join(OUT, vp.id, s.role, `${name}.png`);
    const rec = { viewport: vp.id, role: s.role, screen: name, path: s.path, file: path.relative(repo, file) };
    try {
      await page.goto(`${BASE}${s.path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await settle(page);
      if (s.action) {
        rec.actionOk = await ACTIONS[s.action](page);
        await settle(page);
      }
      rec.finalPath = new URL(page.url()).pathname;
      Object.assign(rec, await page.evaluate(pageChecks, { touch: vp.touch }));
      if (!flag('no-axe') && AXE_VIEWPORTS.includes(vp.id)) {
        // Contraste mesuré sur l'état final : on laisse finir les entrées
        // animées (fondu, glissé) — les animations infinies sont ignorées.
        await page
          .evaluate(() =>
            Promise.race([
              Promise.all(
                document
                  .getAnimations()
                  .filter((an) => an.effect?.getComputedTiming().endTime !== Infinity)
                  .map((an) => an.finished.catch(() => {}))
              ),
              new Promise((r) => setTimeout(r, 3000)),
            ])
          )
          .catch(() => {});
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        rec.axe = axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        }));
      }
      mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled', timeout: 30_000 });
    } catch (err) {
      rec.error = String(err.message).slice(0, 300);
    }
    rec.pageErrors = consoleErrors;
    results.push(rec);
    await ctx.close();
    done++;
    if (done % 25 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}`);
  };

  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (queue.length) await run(queue.shift());
    })
  );

  await browser.close();
  try {
    process.kill(-next.pid, 'SIGTERM');
  } catch {
    next.kill();
  }
  await mock.close();

  results.sort((a, b) => `${a.role}/${a.screen}/${a.viewport}`.localeCompare(`${b.role}/${b.screen}/${b.viewport}`));
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), engine: ENGINE, unknownMock: [...mock.unknown], results }, null, 2));
  writeFileSync(path.join(OUT, 'summary.md'), summarize(results, [...mock.unknown]));
  console.log(`Rapport : ${path.relative(repo, OUT)}/summary.md`);
}

function summarize(results, unknown) {
  const lines = [`# Audit automatisé — ${path.basename(OUT)}`, '', `Captures : ${results.length} · moteur : ${ENGINE}`, ''];
  const errors = results.filter((r) => r.error);
  const overflow = results.filter((r) => r.overflow?.length || (r.docWidth && r.docWidth > VIEWPORTS.find((v) => v.id === r.viewport).w + 1));
  const targets = results.filter((r) => r.smallTargetsCount);
  const inputs = results.filter((r) => r.smallInputs?.length);
  const imgs = results.filter((r) => r.images?.length);
  const cls = results.filter((r) => r.cls > 0.1);
  const pageErrors = results.filter((r) => r.pageErrors?.length);
  const axe = {};
  for (const r of results) for (const v of r.axe ?? []) {
    const k = `${v.impact} · ${v.id}`;
    axe[k] ??= { help: v.help, screens: new Set(), nodes: 0 };
    axe[k].screens.add(`${r.role}/${r.screen}`);
    axe[k].nodes += v.nodes;
  }
  lines.push('| Contrôle | Captures concernées |', '|---|---|');
  lines.push(`| Erreurs de capture | ${errors.length} |`);
  lines.push(`| Débordement horizontal | ${overflow.length} |`);
  lines.push(`| Cibles tactiles < 44 px (au moins une) | ${targets.length} |`);
  lines.push(`| Champs < 16 px (tactile) | ${inputs.length} |`);
  lines.push(`| Images sans alt / dimensions | ${imgs.length} |`);
  lines.push(`| CLS > 0,1 | ${cls.length} |`);
  lines.push(`| Erreurs JS | ${pageErrors.length} |`);
  lines.push(`| Violations axe (types) | ${Object.keys(axe).length} |`, '');
  if (unknown.length) lines.push(`Appels inconnus du mock : ${unknown.join(', ')}`, '');
  const section = (title, rows, fmt) => {
    if (!rows.length) return;
    lines.push(`## ${title}`, '');
    for (const r of rows.slice(0, 200)) lines.push(`- **${r.role}/${r.screen}** @ ${r.viewport} — ${fmt(r)}`);
    lines.push('');
  };
  section('Erreurs de capture', errors, (r) => r.error);
  section('Débordement horizontal', overflow, (r) => `${r.docWidth}px · ${r.overflow.join(' | ')}`);
  section('Champs < 16 px', inputs, (r) => r.smallInputs.join(' | '));
  section('Cibles tactiles < 44 px', targets, (r) => `${r.smallTargetsCount} · ${r.smallTargets.slice(0, 6).join(' | ')}`);
  section('Images', imgs, (r) => r.images.join(' | '));
  section('CLS > 0,1', cls, (r) => String(r.cls));
  section('Erreurs JS', pageErrors, (r) => r.pageErrors.join(' | '));
  if (Object.keys(axe).length) {
    lines.push('## axe-core', '', '| Impact · règle | Nœuds | Écrans |', '|---|---|---|');
    for (const [k, v] of Object.entries(axe).sort()) lines.push(`| ${k} — ${v.help} | ${v.nodes} | ${[...v.screens].join(', ')} |`);
  }
  return lines.join('\n') + '\n';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
