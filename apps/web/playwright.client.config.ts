import { defineConfig, devices } from '@playwright/test';

// Parcours CLIENT connectés (parent + lien enfant), contre le backend Supabase
// simulé de scripts/ux-audit/mock — aucun compte ni donnée de production.
//   pnpm --filter web test:e2e:client
// Le build est fait avec NEXT_PUBLIC_SUPABASE_URL vers le mock (build-mock.mjs).
const PORT = 3300;
const MOCK_PORT = 54321;

export default defineConfig({
  testDir: './e2e-client',
  // Un seul backend simulé, à état partagé : exécution en série.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // La CSP de prod n'autorise que https://*.supabase.co ; le mock est en http local.
    bypassCSP: true,
    serviceWorkers: 'block',
    locale: 'fr-CA',
    timezoneId: 'America/Toronto',
    trace: 'retain-on-failure',
    // Environnement sans téléchargement de navigateur : Chromium fourni (optionnel).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  // L'app est « 80 % mobile » : parcours vérifiés sur un téléphone.
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: `node scripts/ux-audit/mock/server.mjs --port ${MOCK_PORT}`,
      port: MOCK_PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `node scripts/ux-audit/build-mock.mjs && npx --no-install next start -p ${PORT} -H 127.0.0.1`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
