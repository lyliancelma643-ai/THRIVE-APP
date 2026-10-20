import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { STYLE_MIGRATION, isLegacyStyleKey, normalizeStyle, parseStyle } from './styleMigration';

describe('migration des valeurs de style stockées', () => {
  it('natif → lin, carnet → lin, nuit → veillee', () => {
    expect(STYLE_MIGRATION).toEqual({ natif: 'lin', carnet: 'lin', nuit: 'veillee' });
    expect(normalizeStyle('natif')).toBe('lin');
    expect(normalizeStyle('carnet')).toBe('lin');
    expect(normalizeStyle('nuit')).toBe('veillee');
  });
  it('lin et veillee passent tels quels', () => {
    expect(normalizeStyle('lin')).toBe('lin');
    expect(normalizeStyle('veillee')).toBe('veillee');
  });
  it('inconnue, vide, nulle ou d’un autre type ⇒ défaut (lin) ou repli demandé', () => {
    for (const v of ['fluo', '', 'NUIT', ' nuit', null, undefined, 3, {}, ['lin']]) expect(normalizeStyle(v)).toBe('lin');
    expect(normalizeStyle('zzz', 'veillee')).toBe('veillee');
  });
  it('parseStyle distingue « absent/inconnu » (null) d’une vraie valeur', () => {
    expect(parseStyle(null)).toBeNull();
    expect(parseStyle('fluo')).toBeNull();
    expect(parseStyle('nuit')).toBe('veillee');
    expect(isLegacyStyleKey('toString')).toBe(false);
    expect(isLegacyStyleKey('natif')).toBe(true);
  });
});

describe('les anciennes clés n’existent que dans la table de migration ', () => {
  // Clés de style entre guillemets ou deux-points : 'natif' / "nuit" / carnet: … ; les mots courants (« carnet de moments ») restent permis.
  const KEY = /['"`](natif|nuit|carnet)['"`]|\b(natif|nuit|carnet)\s*:/;
  const ALLOWED = new Set(['styleMigration.ts', 'styleMigration.test.ts', 'design.test.ts', 'styleSync.test.ts']);
  it('aucun fichier de design/ ne réintroduit natif / nuit / carnet comme clé de style', () => {
    const offenders: string[] = [];
    for (const f of readdirSync(__dirname)) {
      if (!/\.(ts|tsx)$/.test(f) || ALLOWED.has(f)) continue;
      const lines = readFileSync(resolve(__dirname, f), 'utf8').split('\n');
      lines.forEach((l, i) => KEY.test(l) && offenders.push(`${f}:${i + 1}: ${l.trim()}`));
    }
    expect(offenders).toEqual([]);
  });
  it('tabConfig.ts ne cite l’ancienne valeur que dans son commentaire de test (jamais comme clé)', () => {
    const src = readFileSync(resolve(__dirname, 'tabConfig.ts'), 'utf8');
    expect(KEY.test(src)).toBe(false);
  });
});
