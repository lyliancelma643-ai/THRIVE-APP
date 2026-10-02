import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// Co-parent invité par le titulaire (family_members PARENT). Côté base, l'accès
// est ouvert par la migration 066 (testée par supabase/tests/rls) ; ici on vérifie
// que l'app trouve la famille par family_members et pas seulement par parent_id.
const CO_PARENT = 'mathieu.tremblay@demo.thrive';

test.describe('Co-parent', () => {
  test('voit les enfants et le bilan de la famille', async ({ page }) => {
    await loginAs(page, CO_PARENT);
    await page.goto('/parent/bilans');
    await expect(page.getByRole('button', { name: "Changer d'enfant" })).toContainText('Léo');
    // Activation par le coach héritée du titulaire : bilan complet, pas l'aperçu verrouillé.
    await expect(page.locator('.bilan-root')).toBeVisible();
  });

  test('ajoute un enfant dans la famille existante, mais ne peut pas inviter de parent', async ({ page }) => {
    await loginAs(page, CO_PARENT);
    await page.goto('/parent/select-profile');
    const parentCard = page.getByRole('button', { name: /Parent/ }).first();
    await expect(parentCard).toBeDisabled();
    await expect(parentCard).toContainText('Seul le titulaire du compte famille peut inviter un parent.');
    await expect(page.getByRole('button', { name: /Enfant/ }).first()).toBeEnabled();
  });
});
