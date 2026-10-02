import { test, expect } from '@playwright/test';

// Documents légaux publics (sans compte), accessibles depuis l'inscription et la page Compte.
test.describe('Pages légales', () => {
  test('politique de confidentialité : responsable, droits, délai de 30 jours, CAI', async ({ page }) => {
    await page.goto('/legal/confidentialite');
    await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Responsable de la protection/ })).toBeVisible();
    await expect(page.getByText(/au plus tard 30 jours/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Commission d’accès à l’information/ })).toHaveAttribute('href', 'https://www.cai.gouv.qc.ca');
    await expect(page.getByText(/ca-central-1/)).toBeVisible();
  });

  test('conditions : essai, annulation, mois offert, droit applicable', async ({ page }) => {
    await page.goto('/legal/conditions');
    await expect(page.getByRole('heading', { level: 1, name: 'Conditions d’utilisation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '5. Certificat Maison : un mois offert' })).toBeVisible();
    await expect(page.getByText(/essai de 30 jours est offert une seule fois/)).toBeVisible();
    await expect(page.getByRole('heading', { name: '12. Droit applicable et litiges' })).toBeVisible();
  });
});
