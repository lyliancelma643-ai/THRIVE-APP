import { defineConfig, devices } from '@playwright/test';

// Tests E2E des parcours vitaux. Ciblent surtout les garanties qui ne
// dépendent d'aucun compte réel (redirections du middleware, pages publiques,
// token de questionnaire invalide) → exécutables tels quels en CI.
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile : l'app est « 80 % mobile » — on vérifie aussi ce viewport.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Build de prod (SW + headers réels) puis start sur un port dédié.
    // npx --no-install : résout `next` depuis node_modules, sans dépendre de
    // pnpm sur le PATH (absent en local hors corepack ; présent en CI).
    command: `npx --no-install next build && npx --no-install next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
