import { describe, expect, it } from 'vitest';
import { ACCOUNT_DELETION_PATH, LEGAL_LINKS, PRIVACY_PATH, TERMS_PATH } from './legal';

describe('liens légaux', () => {
  it('pages internes par défaut, sans aucune variable d’environnement', () => {
    expect(TERMS_PATH).toBe('/cgu');
    expect(PRIVACY_PATH).toBe('/confidentialite');
    expect(LEGAL_LINKS.terms).toBe(process.env.NEXT_PUBLIC_TERMS_URL || '/cgu');
    expect(LEGAL_LINKS.privacy).toBe(process.env.NEXT_PUBLIC_PRIVACY_URL || '/confidentialite');
  });
  it('URL de suppression déclarable à Google Play', () => {
    expect(ACCOUNT_DELETION_PATH).toBe('/confidentialite#suppression');
  });
});
