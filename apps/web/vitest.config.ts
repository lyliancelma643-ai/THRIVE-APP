import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests unitaires — couche de transformation du Mode Terrain.
// Les parcours d'interface restent couverts par Playwright (e2e/).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
