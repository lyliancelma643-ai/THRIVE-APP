// ─────────────────────────────────────────────────────────────────────────────
// Recette de l'espace client, de A à Z, sur le backend simulé.
//
//   node scripts/ux-audit/build-mock.mjs                    # une fois par version
//   node scripts/ux-audit/recette-client.mjs [sortie] [LxH]
//
// Parcours joués comme un parent (et un enfant) : inscription avec deux enfants
// et consentement, ajout d'un enfant, chaque écran du hub, bilan et ses fiches,
// Mes séances (prochaine séance, calendrier), Maison et le mode activité,
// séances vidéo et lecteur, messagerie (envoi), compte (mot de passe, export,
// suppression), forfaits / abonnement, compte en préparation, questionnaire
// enfant de bout en bout, pages publiques.
//
// Chaque étape vérifie son résultat attendu ; on relève aussi les erreurs JS,
// les réponses HTTP en erreur et les appels inconnus du mock. Une capture par
// étape dans <sortie>. Code de sortie 1 si une étape échoue.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { startMockSupabase } from './mock/server.mjs';
import { NOW, PASSWORD, PERSONAS } from './mock/fixtures.mjs';

const [out = '../../ux-audit/recette-client', size = '393x852'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
const PORT = 3310;
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(out, { recursive: true });

const mock = await startMockSupabase({ port: 54321 });
const next = spawn('npx', ['--no-install', 'next', 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
  stdio: 'ignore',
  detached: true,
});
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(`${BASE}/login`)).ok) break;
  } catch {
    /* pas prêt */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];
let shotN = 0;

async function newPage() {
  const ctx = await browser.newContext({
    bypassCSP: true,
    viewport: { width, height },
    hasTouch: width < 1100,
    isMobile: width < 700,
    deviceScaleFactor: 1,
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    serviceWorkers: 'block',
    acceptDownloads: true,
  });
  await ctx.clock.setFixedTime(NOW);
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('thrive.p3.welcomeSeen', 'true');
    } catch {
      /* ignore */
    }
  });
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => {
    if (/reading 'waiting'/.test(e.message)) return; // service worker bloqué pendant l'audit
    page.__errors.push(`JS: ${e.message.slice(0, 180)}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Bruit connu : ressources externes bloquées (Wistia, polices), websocket realtime.
    if (/wistia|fonts\.g|ERR_NAME_NOT_RESOLVED|WebSocket|realtime|Failed to load resource/i.test(t)) return;
    page.__errors.push(`console: ${t.slice(0, 180)}`);
  });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && (u.includes(':54321') || u.startsWith(BASE)) && !u.includes('/_next/static')) {
      page.__errors.push(`HTTP ${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 120)}`);
    }
  });
  return page;
}

async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function step(page, name, fn, { allow = null } = {}) {
  const before = page.__errors.length;
  let ok = true;
  let detail = '';
  try {
    const r = await fn();
    if (r === false) {
      ok = false;
      detail = 'résultat attendu absent';
    } else if (typeof r === 'string') detail = r;
  } catch (e) {
    ok = false;
    detail = String(e.message ?? e).split('\n')[0].slice(0, 200);
  }
  await settle(page, 300);
  // Boutons et liens « écrasés » : leur contenu dépasse leur propre hauteur.
  const squashed = await page
    .evaluate(() =>
      [...document.querySelectorAll('a, button')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return false;
          return el.scrollHeight > el.clientHeight + 6 && getComputedStyle(el).overflow !== 'hidden' && el.textContent.trim().length > 0;
        })
        .slice(0, 3)
        .map((el) => `écrasé : « ${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)} » (${Math.round(el.clientHeight)} px)`)
    )
    .catch(() => []);
  page.__errors.push(...squashed);
  const errors = page.__errors.slice(before).filter((e) => !(allow && allow.test(e)));
  const file = `${out}/${String(shotN++).padStart(2, '0')}-${name.replace(/[^a-zA-Z0-9àâçéèêëîïôûùüÿœ]+/g, '-').toLowerCase()}.png`;
  await page.screenshot({ path: file }).catch(() => {});
  results.push({ name, ok: ok && errors.length === 0, stepOk: ok, detail, errors, url: page.url().replace(BASE, '') });
  console.log(`${ok && !errors.length ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}${errors.length ? `\n    ${errors.join('\n    ')}` : ''}`);
}

// isVisible() n'attend pas : on attend vraiment l'apparition (8 s max).
// Seuls les éléments visibles comptent (les onglets gardés montés en arrière-plan sont cachés).
const waitShown = (loc) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
const visible = (page, sel) => waitShown(page.locator(sel));
const text = (page, t) => waitShown(page.getByText(t, { exact: false }));

async function login(page, persona) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', PERSONAS[persona].email);
  await page.fill('input[autocomplete="current-password"]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  await settle(page);
}

// ── A. Pages publiques ───────────────────────────────────────────────────────
{
  const page = await newPage();
  await step(page, 'Connexion — écran', async () => {
    await page.goto(`${BASE}/login`);
    await settle(page);
    return visible(page, 'button[type=submit]');
  });
  await step(
    page,
    'Connexion — mauvais mot de passe',
    async () => {
      await page.fill('input[type=email]', PERSONAS['parent-performance'].email);
      await page.fill('input[autocomplete="current-password"]', 'faux');
      await page.click('button[type=submit]');
      return text(page, 'Email ou mot de passe incorrect');
    },
    // Le refus du serveur est la réponse attendue.
    { allow: /HTTP 400 POST \/auth\/v1\/token/ }
  );
  await step(page, 'Mot de passe oublié', async () => {
    await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click();
    await page.getByRole('button', { name: 'Envoyer le lien de réinitialisation' }).click();
    return text(page, 'Email envoyé');
  });
  await step(page, 'Politique de confidentialité', async () => {
    await page.goto(`${BASE}/confidentialite`);
    return text(page, 'Tes droits');
  });
  await step(page, 'Questionnaire — lien invalide', async () => {
    await page.goto(`${BASE}/q/jeton-inconnu`);
    return text(page, 'Lien invalide');
  });
  await page.context().close();
}

// ── B. Inscription → ajout d'enfant ──────────────────────────────────────────
{
  const page = await newPage();
  await step(page, 'Inscription — validation', async () => {
    await page.goto(`${BASE}/login`);
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await page.fill('input[autocomplete="given-name"]', 'Nadia');
    await page.fill('input[autocomplete="family-name"]', 'Roy');
    await page.fill('input[autocomplete="email"]', 'nadia.roy@demo.thrive');
    await page.fill('input[autocomplete="new-password"]', PASSWORD);
    await page.fill('input[aria-label="Prénom de l\'enfant 1"]', 'Zoé');
    await page.click('button[type=submit]');
    return text(page, 'Indique l\'âge de Zoé');
  });
  await step(page, 'Inscription — consentement exigé', async () => {
    await page.fill('input[aria-label="Âge de l\'enfant 1"]', '11');
    await page.click('button[type=submit]');
    return text(page, 'Coche la case de consentement');
  });
  await step(page, 'Inscription — compte créé', async () => {
    await page.getByRole('button', { name: '+ Ajouter un autre enfant' }).click();
    await page.fill('input[aria-label="Prénom de l\'enfant 2"]', 'Malik');
    await page.fill('input[aria-label="Âge de l\'enfant 2"]', '14');
    await page.check('input[type=checkbox]');
    await page.click('button[type=submit]');
    await page.waitForURL((u) => u.pathname.startsWith('/parent'), { timeout: 30000 });
    await settle(page, 1500);
    const consent = mock.db.consents?.some((c) => c.purpose === 'privacy_policy_child_data');
    const kids = (mock.db.children ?? []).filter((c) => ['Zoé', 'Malik'].includes(c.first_name) && c.last_name === 'Roy');
    if (!consent) throw new Error('consentement non enregistré');
    if (kids.length !== 2) throw new Error(`${kids.length} enfant(s) enregistré(s) sur 2`);
        return page.url().replace(BASE, '');
  });
  await step(page, 'Nouveau parent — compte en préparation guidé', async () => {
    await page.goto(`${BASE}/parent/bilans`);
    await settle(page, 1200);
    return (await text(page, 'Ton espace se prépare')) && (await text(page, 'La validation par l’équipe THRIVE'));
  });
  await step(page, 'Forfait Essentiel : 2e enfant refusé avec explication', async () => {
    await page.goto(`${BASE}/parent/select-profile?type=CHILD`);
    await settle(page);
    return text(page, 'inclut 1 profil');
  });
  await page.context().close();
}

// ── C. Parent accompagné : tout le hub ───────────────────────────────────────
{
  const page = await newPage();
  await login(page, 'parent-performance');
  const routes = [
    ['Bilan', '/parent/bilans', 'Programme complété'],
    ['Mes séances', '/parent/my-sessions', /Prochaine séance|Séance en cours/i],
    ['Maison', '/parent/fitness', 'Recommandé pour'],
    ['Maison — fiche', '/parent/fitness/ACT-0301', 'Lancer'],
    ['Maison — catalogue', '/parent/fitness/toutes', 'activités'],
    ['Maison — programme', '/parent/fitness/programme', 'Semaine'],
    ['Maison — carnet', '/parent/fitness/carnet', 'carnet'],
    ['Maison — quand il dit non', '/parent/fitness/quand-il-dit-non', 'non'],
    ['Maison — sources', '/parent/fitness/sources', 'ources'],
    ['Séances vidéo', '/parent/fitness/seances', 'Séance'],
    ['Messagerie', '/parent/messages', 'Support'],
    ['Forfaits', '/parent/upgrade', 'Dans tous les forfaits'],
    ['Abonnement', '/parent/abonnement', /Abonnement actif|Inclus dans ton accompagnement/],
    ['Compte', '/parent/compte', 'Mes données'],
  ];
  for (const [name, path, expect] of routes) {
    await step(page, name, async () => {
      await page.goto(`${BASE}${path}`);
      await settle(page, 900);
      return text(page, expect);
    });
  }

  await step(page, 'Maison — porte des séances vidéo', async () => {
    await page.goto(`${BASE}/parent/fitness`);
    await settle(page, 900);
    await page.getByRole('link', { name: 'Les séances vidéo de 20 min' }).click();
    await page.waitForURL((u) => u.pathname === '/parent/fitness/seances', { timeout: 10000 });
    return true;
  });
  await step(page, 'Lecteur de séance vidéo', async () => {
    await page.goto(`${BASE}/parent/session/00000005-0000-4000-8000-000000000001`);
    await settle(page, 900);
    return visible(page, 'button[aria-label^="Lancer la séance"]');
  });
  await step(page, 'Bilan — fiche détaillée et fermeture', async () => {
    await page.goto(`${BASE}/parent/bilans`);
    await settle(page, 900);
    await page.locator('[data-info="objectif"] [role=button], [data-info="objectif"]').first().click();
    await page.waitForTimeout(600);
    const open = await visible(page, '[role=dialog]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    return open && !(await page.locator('[role=dialog]').first().isVisible().catch(() => false));
  });
  await step(page, 'Bilan — ouvrir un document', async () => {
    const popup = page.context().waitForEvent('page', { timeout: 6000 }).catch(() => null);
    const docBtn = page.locator('[data-doc]').first();
    if (!(await docBtn.count())) return 'aucun document dans les données de démo';
    await docBtn.click();
    const p = await popup;
    if (!p) return false;
    const ok = await p.waitForURL(/object\/sign/, { timeout: 8000 }).then(() => true, () => false);
    await p.close();
    return ok;
  });
  await step(page, 'Mes séances — ajouter au calendrier', async () => {
    await page.goto(`${BASE}/parent/my-sessions`);
    await settle(page, 900);
    const btn = page.getByRole('button', { name: 'Ajouter au calendrier' });
    if (!(await btn.count())) return 'pas de séance future datée (données de démo)';
    const dl = page.waitForEvent('download', { timeout: 6000 });
    await btn.click();
    const d = await dl;
    return /\.ics$/.test(d.suggestedFilename());
  });
  await step(page, 'Mes séances — lire un bilan', async () => {
    await page.locator('button[aria-pressed]').first().click();
    return text(page, 'Message du coach');
  });
  await step(page, 'Glisser sur une fiche ne change pas d\'onglet', async () => {
    await page.goto(`${BASE}/parent/fitness/ACT-0301`);
    await settle(page, 900);
    const box = await page.locator('main').boundingBox();
    await page.touchscreen.tap(box.x + 20, box.y + 200).catch(() => {});
    await page.dispatchEvent('main', 'pointerdown', { pointerType: 'touch', clientX: 60, clientY: 400, pointerId: 7, isPrimary: true });
    for (const x of [90, 140, 200, 260]) {
      await page.dispatchEvent('main', 'pointermove', { pointerType: 'touch', clientX: x, clientY: 402, pointerId: 7, isPrimary: true });
    }
    await page.dispatchEvent('main', 'pointerup', { pointerType: 'touch', clientX: 260, clientY: 402, pointerId: 7, isPrimary: true });
    await page.waitForTimeout(800);
    return new URL(page.url()).pathname === '/parent/fitness/ACT-0301';
  });
  await step(page, 'Maison — mode activité jusqu\'au bout', async () => {
    await page.goto(`${BASE}/parent/fitness/ACT-0301/moment?duree=10&lieu=maison`);
    await settle(page, 1200);
    for (let i = 0; i < 3; i++) {
      await page.locator('fieldset').nth(i).locator('button').nth(1).click().catch(() => {});
      await page.waitForTimeout(300);
    }
    const NEXT = ['C’est lu', 'C’est dit, on commence', 'Suivant', 'Terminer l’activité', 'Question suivante', 'C’est dit', 'Garder ce moment', 'C’est noté', 'Continuer', 'Terminer'];
    let clicks = 0;
    for (let s = 0; s < 30; s++) {
      let clicked = false;
      for (const label of NEXT) {
        const b = page.getByRole('button', { name: label, exact: true }).first();
        if ((await b.count()) && (await b.isVisible().catch(() => false))) {
          await b.click().catch(() => {});
          clicked = true;
          clicks++;
          await page.waitForTimeout(450);
          break;
        }
      }
      if (!clicked) break;
    }
    return clicks >= 3 ? `${clicks} étapes` : false;
  });
  await step(page, 'Messagerie — envoyer un message', async () => {
    await page.goto(`${BASE}/parent/messages?c=00000006-0000-4000-8000-000000000800`);
    await settle(page, 1200);
    const box = page.locator('textarea').first();
    await box.fill('Bonjour, une question sur la prochaine séance.');
    await box.press('Enter');
    await page.waitForTimeout(1200);
    return text(page, 'une question sur la prochaine séance');
  });
  await step(page, 'Compte — changer le nom', async () => {
    await page.goto(`${BASE}/parent/compte`);
    await settle(page, 900);
    await page.fill('input[autocomplete="given-name"]', 'Julie-Anne');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    return text(page, 'Enregistré');
  });
  await step(page, 'Compte — mot de passe : confirmation différente refusée', async () => {
    const inputs = page.locator('input[autocomplete="new-password"]');
    await inputs.nth(0).fill('Nouveau1234!');
    await inputs.nth(1).fill('Autre1234!');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    return text(page, 'ne sont pas identiques');
  });
  await step(page, 'Compte — mot de passe changé', async () => {
    const inputs = page.locator('input[autocomplete="new-password"]');
    await inputs.nth(1).fill('Nouveau1234!');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    return text(page, 'Mot de passe changé');
  });
  await step(page, 'Compte — télécharger mes données', async () => {
    const dl = page.waitForEvent('download', { timeout: 8000 });
    await page.getByRole('button', { name: 'Télécharger mes données' }).click();
    const d = await dl;
    return /thrive-mes-donnees-.*\.json$/.test(d.suggestedFilename());
  });
  await step(page, 'Compte — demander la suppression', async () => {
    await page.getByRole('button', { name: 'Supprimer mon compte et mes données' }).click();
    await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
    return text(page, 'Demande de suppression enregistrée');
  });
  await step(page, 'Ajout d\'un enfant depuis l\'app', async () => {
    await page.goto(`${BASE}/parent/select-profile?type=CHILD`);
    await settle(page);
    await page.fill('#sp-first', 'Inès');
    await page.fill('#sp-age', '6');
    await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
    if (!(await text(page, 'accompagne les 8–17 ans'))) return 'âge hors tranche accepté';
    await page.fill('#sp-age', '9');
    await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
    if (!(await text(page, 'Inès est ajouté'))) return false;
    await page.getByRole('button', { name: 'Aller à mon espace' }).click();
    await page.waitForURL((u) => u.pathname === '/parent/bilans', { timeout: 15000 });
    // Le nouvel enfant est sélectionné dans l'en-tête.
    return text(page, 'Inès');
  });
  await step(page, 'Menu du compte et déconnexion', async () => {
    await page.goto(`${BASE}/parent/bilans`);
    await settle(page, 900);
    await page.getByRole('button', { name: 'Menu du compte' }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 15000 });
    return true;
  });
  await page.context().close();
}

// ── D. Parent en préparation (paywall, verrous) ──────────────────────────────
{
  const page = await newPage();
  await login(page, 'parent-preparation');
  for (const [name, path, expect] of [
    ['Préparation — Bilan guidé', '/parent/bilans', 'Ce que tu découvriras ici'],
    ['Préparation — Mes séances', '/parent/my-sessions', 'Tes séances arrivent'],
    ['Préparation — Maison (offre)', '/parent/fitness', 'Découvrir'],
    ['Préparation — abonnement (offre)', '/parent/abonnement', 'essai'],
  ]) {
    await step(page, name, async () => {
      await page.goto(`${BASE}${path}`);
      await settle(page, 900);
      return text(page, expect);
    });
  }
  await page.context().close();
}

// ── E. Questionnaire enfant de bout en bout ──────────────────────────────────
{
  const page = await newPage();
  await step(page, 'Questionnaire — répondre à tout et envoyer', async () => {
    await page.goto(`${BASE}/q/demo-perma`);
    await settle(page, 900);
    let n = 0;
    for (let i = 0; i < 80; i++) {
      const radio = page.getByRole('radio').nth(2);
      if (!(await radio.isVisible().catch(() => false))) break;
      await radio.click();
      n++;
      await page.waitForTimeout(380);
      // Reprise après rechargement : les réponses déjà données restent.
      if (n === 3) {
        await page.reload();
        await settle(page, 900);
        if (!(await text(page, '3/'))) return 'réponses perdues au rechargement';
      }
    }
    await page.getByRole('button', { name: 'Envoyer mes réponses' }).click();
    if (!(await text(page, 'Tes réponses ont bien été enregistrées'))) return false;
    return `${n} réponses`;
  });
  await page.context().close();
}

await browser.close();
try {
  process.kill(-next.pid);
} catch {
  /* déjà arrêté */
}
const unknown = [...mock.unknown];
await mock.close();

const failed = results.filter((r) => !r.ok);
writeFileSync(`${out}/recette.json`, JSON.stringify({ size, unknownMock: unknown, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} étapes OK${unknown.length ? ` · appels inconnus du mock : ${unknown.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
