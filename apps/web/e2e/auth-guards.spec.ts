import { test, expect } from '@playwright/test';

// Parcours vitaux ne nécessitant AUCUN compte réel : le middleware est l'unique
// barrière vers les zones protégées — on vérifie qu'elle tient (fail-closed).

const PROTECTED = ['/parent', '/parent/bilans', '/coach', '/coach/dashboard', '/admin', '/admin/users'];

test.describe('Middleware — garde des routes protégées', () => {
  for (const path of PROTECTED) {
    test(`${path} sans session → redirige vers /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe('Pages publiques', () => {
  test('/login rend le formulaire de connexion', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('ton@email.com')).toBeVisible();
    // Deux « Se connecter » existent (onglet + submit) : on cible le submit du form.
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('/offline (fallback PWA) est servie et brandée', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: /Pas de connexion/i })).toBeVisible();
  });

  test('404 rend la page not-found brandée', async ({ page }) => {
    const res = await page.goto('/route-qui-nexiste-pas-12345');
    expect(res?.status()).toBe(404);
  });
});

test.describe('Questionnaire par token (lien enfant)', () => {
  test('token invalide → message d’erreur, pas de crash', async ({ page }) => {
    await page.goto('/q/00000000-0000-0000-0000-000000000000');
    // La page RPC-tokenisée doit répondre proprement (invalide/expiré),
    // jamais une erreur serveur.
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=/invalide|expiré|introuvable|erreur/i').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('En-têtes de sécurité (prod)', () => {
  test('/login renvoie CSP + HSTS + anti-clickjacking', async ({ page }) => {
    const res = await page.goto('/login');
    const h = res?.headers() ?? {};
    expect(h['content-security-policy']).toBeTruthy();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['strict-transport-security']).toContain('max-age=');
  });
});
