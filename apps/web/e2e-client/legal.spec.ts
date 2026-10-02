import { test, expect } from '@playwright/test';

// Documents légaux publics (sans compte), accessibles depuis l'inscription,
// l'offre d'abonnement, la page Compte et les apps mobiles.
test.describe('Pages légales', () => {
  test('politique de confidentialité complète, sans champ à compléter', async ({ page }) => {
    await page.goto('/confidentialite');
    await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Responsable de la protection/ })).toBeVisible();
    await expect(page.getByText(/au plus tard 30 jours/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Commission d’accès à l’information/ })).toHaveAttribute('href', 'https://www.cai.gouv.qc.ca');
    await expect(page.getByText(/ca-central-1/)).toBeVisible();
    await expect(page.getByText('[à compléter')).toHaveCount(0);
  });

  test('section suppression publique (URL Google Play)', async ({ page }) => {
    await page.goto('/confidentialite#suppression');
    await expect(page.getByRole('heading', { name: '10. Supprimer votre compte et vos données' })).toBeInViewport();
    await expect(page.getByText('Ce qui est conservé')).toBeVisible();
  });

  test('conditions : essai, mois offert, clauses Apple, droit applicable', async ({ page }) => {
    await page.goto('/cgu');
    await expect(page.getByRole('heading', { level: 1, name: 'Conditions d’utilisation' })).toBeVisible();
    await expect(page.getByText(/essai de 30 jours est offert une seule fois/)).toBeVisible();
    await expect(page.getByRole('heading', { name: '5. Certificat Maison : un mois offert' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '9. Applications iPhone et Android' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '13. Droit applicable et litiges' })).toBeVisible();
    await expect(page.getByText('[à compléter')).toHaveCount(0);
  });

  test('anciennes adresses redirigées', async ({ page }) => {
    await page.goto('/legal/conditions');
    await expect(page).toHaveURL(/\/cgu$/);
    await page.goto('/legal/confidentialite');
    await expect(page).toHaveURL(/\/confidentialite$/);
  });

  test('inscription : liens légaux présents sans aucune configuration', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await expect(page.getByRole('link', { name: 'conditions d\'utilisation' })).toHaveAttribute('href', '/cgu');
  });
});
