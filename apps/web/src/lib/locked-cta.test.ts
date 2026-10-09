import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { programVideoUrl } from './locked-cta';

// Écrans verrouillés : jamais de paiement, et rien vers le site des packs dans
// la WebView de l'app iOS / Android (anti-steering Apple 3.1.1 / Google Play).
describe('LockedSection — anti-steering', () => {
  it('sans page vidéo dédiée, l’app native ne propose aucun lien externe', () => {
    expect(programVideoUrl(true)).toBeNull();
    expect(programVideoUrl(false)).toMatch(/^https?:\/\//); // web seul : page des packs
  });

  it('aucun lien de paiement dans les écrans verrouillés', () => {
    const src =
      readFileSync(join(__dirname, '../components/parent/LockedSection.tsx'), 'utf8') +
      readFileSync(join(__dirname, 'locked-cta.ts'), 'utf8');
    expect(src).not.toMatch(/checkout|stripe|\/abonnement|create-checkout-session|billing/i);
  });
});
