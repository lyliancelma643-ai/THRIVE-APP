import { test, expect } from '@playwright/test';
import { loginAs, SUPER_ADMIN } from './helpers';

// Droit à l'effacement de bout en bout : demande du parent → file admin avec
// l'échéance légale de 30 jours et le responsable par défaut → suppression.
test('une demande de suppression arrive chez le super-admin et se traite', async ({ browser }) => {
  const parent = await browser.newPage();
  await loginAs(parent, 'karim.benali@demo.thrive');
  await parent.goto('/parent/compte');
  await parent.getByRole('button', { name: 'Supprimer mon compte…' }).click();
  await parent.getByLabel('Pourquoi pars-tu ? (facultatif)').fill('Test E2E');
  await parent.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(parent.getByRole('status').filter({ hasText: '30 jours' })).toBeVisible();
  await parent.close();

  const admin = await browser.newPage();
  await loginAs(admin, SUPER_ADMIN, /\/admin/);
  await admin.goto('/admin/suppressions');
  const row = admin.getByTestId('deletion-request').filter({ hasText: 'karim.benali@demo.thrive' });
  await expect(row).toContainText('30 jours restants');
  await expect(row).toContainText('responsable : Alex Pelletier');
  await expect(row).toContainText('« Test E2E »');

  await row.getByRole('button', { name: 'Supprimer définitivement…' }).click();
  await row.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Compte supprimé' })).toBeVisible();
  await expect(admin.getByRole('link', { name: 'Envoyer la confirmation au parent' })).toHaveAttribute('href', /^mailto:karim\.benali/);
  await expect(admin.getByText('karim.benali@demo.thrive').last()).toBeVisible();
  await admin.close();
});
