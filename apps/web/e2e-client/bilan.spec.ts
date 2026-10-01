import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Bilan parent', () => {
  test('le bilan se charge pour un parent activé', async ({ page }) => {
    await loginAs(page);
    await page.goto('/parent/bilans');
    await expect(page.getByRole('button', { name: "Changer d'enfant" })).toBeVisible();
    await expect(page.locator('.bilan-root')).toBeVisible();
  });

  test('coupure réseau : écran « Réessayer », jamais de squelette sans fin', async ({ page }) => {
    await loginAs(page);
    await page.route('**/rest/v1/sessions**', (r) => r.abort());
    await page.goto('/parent/bilans');
    await expect(page.getByRole('heading', { name: "Le bilan ne s'affiche pas" })).toBeVisible({ timeout: 20_000 });
    await page.unroute('**/rest/v1/sessions**');
    await page.getByRole('button', { name: 'Réessayer' }).first().click();
    await expect(page.locator('.bilan-root')).toBeVisible();
  });
});
