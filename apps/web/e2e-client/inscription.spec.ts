import { test, expect } from '@playwright/test';
import { PASSWORD } from './helpers';

// Régression : children.last_name est NOT NULL en base. L'inscription insérait
// les enfants sans nom → échec avalé, enfants perdus. Le mock reproduit la contrainte.
test.describe('Inscription parent', () => {
  test('les enfants déclarés à l’inscription sont enregistrés', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await page.getByLabel('Prénom', { exact: true }).fill('Camille');
    await page.getByLabel('Nom', { exact: true }).fill('Bérubé');
    await page.getByLabel('Email', { exact: true }).fill(`camille.${Date.now()}@test.thrive`);
    await page.getByLabel('Mot de passe (min. 8 caractères)').fill(PASSWORD);
    await page.getByLabel("Prénom de l'enfant 1").fill('Zoé');
    await page.getByLabel("Âge de l'enfant 1").fill('10');
    await page.getByLabel("Sport de l'enfant 1").selectOption('Natation');
    await page.getByRole('checkbox', { name: /J'accepte les conditions/ }).check();
    await page.getByRole('button', { name: 'Créer mon compte parent' }).click();

    await expect(page).toHaveURL(/\/parent\/bilans/);
    await expect(page.getByRole('button', { name: "Changer d'enfant" })).toContainText('Zoé');
  });

  test('un enfant sans âge est signalé, pas ignoré', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await page.getByLabel('Prénom', { exact: true }).fill('Lou');
    await page.getByLabel('Nom', { exact: true }).fill('Roy');
    await page.getByLabel('Email', { exact: true }).fill(`lou.${Date.now()}@test.thrive`);
    await page.getByLabel('Mot de passe (min. 8 caractères)').fill(PASSWORD);
    await page.getByLabel("Prénom de l'enfant 1").fill('Noah');
    await page.getByRole('checkbox', { name: /J'accepte les conditions/ }).check();
    await page.getByRole('button', { name: 'Créer mon compte parent' }).click();

    await expect(page.locator('main [role=alert]')).toHaveText("Indique l'âge de Noah.");
    await expect(page).toHaveURL(/\/login/);
  });

  test('âge hors 8–17 refusé', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await page.getByLabel('Prénom', { exact: true }).fill('Lou');
    await page.getByLabel('Nom', { exact: true }).fill('Roy');
    await page.getByLabel('Email', { exact: true }).fill(`lou2.${Date.now()}@test.thrive`);
    await page.getByLabel('Mot de passe (min. 8 caractères)').fill(PASSWORD);
    await page.getByLabel("Prénom de l'enfant 1").fill('Noah');
    const age = page.getByLabel("Âge de l'enfant 1");
    await age.fill('6');
    await page.getByRole('checkbox', { name: /J'accepte les conditions/ }).check();
    await page.getByRole('button', { name: 'Créer mon compte parent' }).click();
    // Bloqué avant tout appel réseau par la validation du champ (min = 8).
    expect(await age.evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow)).toBe(true);
    await expect(page).toHaveURL(/\/login/);
  });

  test('sans consentement, le compte n’est pas créé', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Créer un compte' }).click();
    await page.getByLabel('Prénom', { exact: true }).fill('Lou');
    await page.getByLabel('Nom', { exact: true }).fill('Roy');
    await page.getByLabel('Email', { exact: true }).fill(`lou3.${Date.now()}@test.thrive`);
    await page.getByLabel('Mot de passe (min. 8 caractères)').fill(PASSWORD);
    const consent = page.getByRole('checkbox', { name: /J'accepte les conditions/ });
    await page.getByRole('button', { name: 'Créer mon compte parent' }).click();
    expect(await consent.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
  });

  test('mauvais mot de passe : message en français', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('ton@email.com').fill('julie.tremblay@demo.thrive');
    await page.locator('input[type=password]').fill('faux-mot-de-passe');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('main [role=alert]')).toHaveText('Email ou mot de passe incorrect.');
  });
});
