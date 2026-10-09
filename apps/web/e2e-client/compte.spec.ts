import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// Droits du titulaire (App Store 5.1.1(v), Google Play, Loi 25).
test.describe('Compte parent — mes données', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    await page.goto('/parent/compte');
  });

  test('changer de mot de passe envoie un lien', async ({ page }) => {
    await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Lien envoyé' })).toBeVisible();
  });

  test('export des données téléchargeable', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger mes données' }).click();
    expect((await download).suggestedFilename()).toMatch(/^thrive-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('demande de suppression du compte avec confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Supprimer mon compte et mes données' }).click();
    await expect(page.getByText('Cette action est')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer la suppression' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'est enregistrée' })).toBeVisible();
    // L'état est relu en base : il survit au rechargement.
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: 'est enregistrée' })).toBeVisible();
  });
});
