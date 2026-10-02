import { expect, type Page } from '@playwright/test';

// Comptes du backend simulé (scripts/ux-audit/mock/fixtures.mjs).
export const PASSWORD = 'Demo1234!';
export const PARENT = 'julie.tremblay@demo.thrive';

export const SUPER_ADMIN = 'alex.pelletier@demo.thrive';

export async function loginAs(page: Page, email = PARENT, landing: RegExp = /\/parent\//) {
  await page.goto('/login');
  await page.getByPlaceholder('ton@email.com').fill(email);
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(landing);
}
