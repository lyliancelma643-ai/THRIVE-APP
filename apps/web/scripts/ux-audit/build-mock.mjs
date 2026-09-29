// Build de production de l'app, branchée sur le backend Supabase simulé.
// Le code de l'app n'est pas modifié : seules les variables publiques changent.
//   node scripts/ux-audit/build-mock.mjs
import { spawnSync } from 'node:child_process';
import { ANON_KEY } from './mock/server.mjs';

export const MOCK_PORT = 54321;

const r = spawnSync('npx', ['--no-install', 'next', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
    NEXT_TELEMETRY_DISABLED: '1',
  },
});
process.exit(r.status ?? 1);
