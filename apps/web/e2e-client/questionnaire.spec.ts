import { test, expect } from '@playwright/test';

// Lien enfant (sans compte) : questionnaire EPOCH de démonstration.
test.describe('Questionnaire enfant', () => {
  test('les réponses survivent à un rechargement', async ({ page }) => {
    await page.goto('/q/demo-perma');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Léo');
    const groups = page.getByRole('group');
    await groups.nth(0).getByRole('button', { name: /^3 — / }).click();
    await groups.nth(1).getByRole('button', { name: /^4 — / }).click();
    await expect(groups.nth(0).getByRole('button', { name: /^3 — / })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/^2\/\d+ réponses$/)).toBeVisible();

    await page.reload();
    await expect(page.getByText('On a gardé tes réponses')).toBeVisible();
    await expect(page.getByText(/^2\/\d+ réponses$/)).toBeVisible();
    await expect(page.getByRole('group').nth(1).getByRole('button', { name: /^4 — / })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('le focus reste sur le choix après une réponse (page non remontée)', async ({ page }) => {
    await page.goto('/q/demo-perma');
    const btn = page.getByRole('group').nth(2).getByRole('button', { name: /^2 — / });
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toBeFocused();
  });

  test('coupure réseau : message clair et nouvel essai', async ({ page }) => {
    await page.route('**/rest/v1/rpc/questionnaire_get', (r) => r.abort());
    await page.goto('/q/demo-perma');
    await expect(page.locator('[role=alert]').filter({ hasText: 'La connexion est coupée' })).toBeVisible();
    await page.unroute('**/rest/v1/rpc/questionnaire_get');
    await page.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Léo');
  });

  test('lien inconnu', async ({ page }) => {
    await page.goto('/q/jeton-inconnu');
    await expect(page.getByText('Lien invalide ou introuvable.')).toBeVisible();
  });
});
