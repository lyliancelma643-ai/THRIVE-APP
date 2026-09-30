import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import activities from '@/lib/p3-moments/activities.generated.json';

// Chaque activité a sa propre scène animée : on ne laisse pas une fiche sans dessin.
// (On lit le source plutôt que de l'importer : le JSX n'est pas compilé par vitest ici.)
describe('scènes animées des activités', () => {
  const ids = (activities as { activities: { id: string }[] }).activities.map((a) => a.id);
  const source = readFileSync(join(__dirname, 'scenes.tsx'), 'utf8');
  const sceneIds = [...source.matchAll(/^\s+'((?:ACT|BON)-[\w-]+)': \(\) =>/gm)].map((m) => m[1]);

  it('toutes les activités ont une scène', () => {
    expect(ids.filter((id) => !sceneIds.includes(id))).toEqual([]);
  });

  it("aucune scène n'est orpheline ni en double", () => {
    expect(sceneIds.filter((id) => !ids.includes(id))).toEqual([]);
    expect(new Set(sceneIds).size).toBe(sceneIds.length);
  });
});
