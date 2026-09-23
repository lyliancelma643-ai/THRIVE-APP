import { test, expect } from '@playwright/test';

// Programme P3 « Maison » (onglet Maison, ex-Fitness) : les écrans parent restent
// derrière le middleware. Sans session, chaque route redirige vers /login
// (fail-closed). Le parcours connecté (carte du soir → mode activité) demande
// un compte parent de recette et se vérifie manuellement.
const ROUTES = [
  '/parent/fitness',
  '/parent/fitness/programme',
  '/parent/fitness/toutes',
  '/parent/fitness/ACT-0101',
  '/parent/fitness/ACT-0101/moment?duree=10&lieu=maison',
  '/parent/fitness/carnet',
];

test.describe('P3 Maison — garde des routes', () => {
  for (const path of ROUTES) {
    test(`${path} sans session → /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
