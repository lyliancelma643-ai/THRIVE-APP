// ─────────────────────────────────────────────────────────────────────────────
// Lighthouse (mobile + ordinateur) sur les écrans principaux, connecté par rôle.
//
//   node scripts/ux-audit/build-mock.mjs --https       # depuis le dossier de l'app
//   node scripts/ux-audit/lighthouse.mjs --label after --lh <dossier lighthouse> [--app <dossier app>] [--runs 3] [--only id1,id2]
//
// Le backend simulé est servi en HTTPS sous https://mock.supabase.co (autorisé
// par la CSP de production), résolu vers 127.0.0.1 : entrée /etc/hosts pour le
// serveur Next (ajoutée si absente, droits root), règle d'hôte pour Chrome.
// Sorties : ux-audit/lighthouse/<label>/*.json (non versionnés) + summary.md.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdtempSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { startMockSupabase } from "./mock/server.mjs";
import { PASSWORD, PERSONAS } from "./mock/fixtures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");
const args = process.argv.slice(2);
const opt = (n, d) =>
  args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d;
const LABEL = opt("label", "after");
const APP = path.resolve(opt("app", path.resolve(here, "../..")));
const LH_DIR = path.resolve(opt("lh", ""));
const PORT = 3400;
const BASE = `http://127.0.0.1:${PORT}`;
const HOST = "mock.supabase.co";
const CHROME = "/opt/pw-browsers/chromium";
const OUT = path.join(repo, "ux-audit", "lighthouse", LABEL);

const ONLY = opt("only", "");
const RUNS = Number(opt("runs", "1"));
const ALL_PAGES = [
  { id: "connexion", role: null, path: "/login" },
  { id: "parent-bilan", role: "parent-performance", path: "/parent/bilans" },
  { id: "parent-maison", role: "parent-performance", path: "/parent/fitness" },
  {
    id: "parent-mes-seances",
    role: "parent-performance",
    path: "/parent/my-sessions",
  },
  {
    id: "parent-seances-video",
    role: "parent-performance",
    path: "/parent/fitness/seances",
  },
  { id: "coach-tableau-de-bord", role: "coach", path: "/coach/dashboard" },
  { id: "admin-dashboard", role: "admin", path: "/admin" },
];
const PAGES = ONLY
  ? ALL_PAGES.filter((p) => ONLY.split(",").includes(p.id))
  : ALL_PAGES;

const CHROME_FLAGS = [
  "--headless=new",
  "--no-sandbox",
  `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
  "--ignore-certificate-errors",
  "--no-proxy-server",
];

function cert() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "thrive-tls-"));
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "2",
      "-subj",
      `/CN=${HOST}`,
      "-addext",
      `subjectAltName=DNS:${HOST}`,
      "-keyout",
      `${dir}/k.pem`,
      "-out",
      `${dir}/c.pem`,
    ],
    { stdio: "ignore" },
  );
  return {
    key: readFileSync(`${dir}/k.pem`),
    cert: readFileSync(`${dir}/c.pem`),
    publicHost: HOST,
  };
}

async function waitHttp(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      /* pas prêt */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`injoignable : ${url}`);
}

async function main() {
  if (!existsSync(path.join(LH_DIR, "node_modules/lighthouse")))
    throw new Error("--lh <dossier contenant node_modules/lighthouse> requis");
  const hosts = readFileSync("/etc/hosts", "utf8");
  if (!hosts.includes(HOST))
    appendFileSync("/etc/hosts", `\n127.0.0.1 ${HOST}\n`);
  mkdirSync(OUT, { recursive: true });

  const mock = await startMockSupabase({
    port: 443,
    host: "127.0.0.1",
    tls: cert(),
  });
  const next = spawn(
    "npx",
    ["--no-install", "next", "start", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      cwd: APP,
      // Test local uniquement : le middleware (Node) accepte le certificat auto-signé du mock.
      env: {
        ...process.env,
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "ignore",
      detached: true,
    },
  );
  await waitHttp(`${BASE}/login`);

  const { default: lighthouse } = await import(
    pathToFileURL(path.join(LH_DIR, "node_modules/lighthouse/core/index.js"))
      .href
  );
  const chromeLauncher = await import(
    pathToFileURL(
      path.join(LH_DIR, "node_modules/chrome-launcher/dist/index.js"),
    ).href
  );

  // Un profil Chrome connecté par rôle (session Supabase en localStorage + cookie).
  const profiles = {};
  for (const role of new Set(PAGES.map((p) => p.role))) {
    const dir = mkdtempSync(path.join(os.tmpdir(), `lh-${role ?? "public"}-`));
    profiles[role ?? "public"] = dir;
    if (!role) continue;
    const ctx = await chromium.launchPersistentContext(dir, {
      executablePath: CHROME,
      args: CHROME_FLAGS.filter((f) => f !== "--headless=new"),
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill("input[type=email]", PERSONAS[role].email);
    await page.fill("input[type=password]", PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
      timeout: 30_000,
    });
    await ctx.close();
  }

  const summary = [];
  for (const p of PAGES) {
    for (const ff of ["mobile", "desktop"]) {
      const runs = [];
      for (let run = 0; run < RUNS; run++) {
        const chrome = await chromeLauncher.launch({
          chromePath: CHROME,
          userDataDir: profiles[p.role ?? "public"],
          chromeFlags: CHROME_FLAGS,
        });
        try {
          const config =
            ff === "desktop"
              ? (
                  await import(
                    pathToFileURL(
                      path.join(
                        LH_DIR,
                        "node_modules/lighthouse/core/config/desktop-config.js",
                      ),
                    ).href
                  )
                ).default
              : undefined;
          const res = await lighthouse(
            `${BASE}${p.path}`,
            {
              port: chrome.port,
              output: "json",
              onlyCategories: [
                "performance",
                "accessibility",
                "best-practices",
              ],
              disableStorageReset: true,
              logLevel: "error",
            },
            config,
          );
          const lhr = res.lhr;
          writeFileSync(path.join(OUT, `${p.id}-${ff}.json`), res.report);
          const a = lhr.audits;
          const row = {
            page: p.id,
            ff,
            perf: Math.round((lhr.categories.performance.score ?? 0) * 100),
            a11y: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
            bp: Math.round((lhr.categories["best-practices"].score ?? 0) * 100),
            fcp: a["first-contentful-paint"]?.numericValue,
            lcp: a["largest-contentful-paint"]?.numericValue,
            cls: a["cumulative-layout-shift"]?.numericValue,
            tbt: a["total-blocking-time"]?.numericValue,
            finalUrl: lhr.finalDisplayedUrl,
          };
          runs.push(row);
          console.log(JSON.stringify(row));
        } catch (e) {
          console.error(p.id, ff, e.message);
        } finally {
          await chrome.kill();
        }
      }
      // Plusieurs passes : on garde la passe médiane (score de performance).
      if (runs.length)
        summary.push(
          [...runs].sort((x, y) => x.perf - y.perf)[
            Math.floor(runs.length / 2)
          ],
        );
    }
  }
  const fmt = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(2)} s`);
  const md = [
    `# Lighthouse — ${LABEL}`,
    "",
    "Backend simulé local (latence réseau nulle côté données) ; mobile = émulation Moto G Power, CPU ×4, 4G lente.",
    `Passes par mesure : ${RUNS} (médiane retenue).`,
    "INP n'est pas mesurable en navigation Lighthouse : le TBT (temps de blocage) sert d'indicateur de laboratoire.",
    "",
    "| Écran | Format | Perf | Accessibilité | Bonnes pratiques | FCP | LCP | CLS | TBT |",
    "|---|---|---|---|---|---|---|---|---|",
    ...summary.map(
      (r) =>
        `| ${r.page} | ${r.ff} | ${r.perf} | ${r.a11y} | ${r.bp} | ${fmt(r.fcp)} | ${fmt(r.lcp)} | ${r.cls?.toFixed(3)} | ${Math.round(r.tbt)} ms |`,
    ),
  ].join("\n");
  writeFileSync(path.join(OUT, "summary.md"), md + "\n");
  writeFileSync(
    path.join(OUT, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  try {
    process.kill(-next.pid, "SIGTERM");
  } catch {
    next.kill();
  }
  await mock.close();
  console.log(`ux-audit/lighthouse/${LABEL}/summary.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
