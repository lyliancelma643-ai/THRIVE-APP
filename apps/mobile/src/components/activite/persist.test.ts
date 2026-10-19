// Lancer : cd apps/mobile && ../web/node_modules/.bin/vitest run src/components/activite/persist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { insert, from: vi.fn(() => ({ insert })) };
});
vi.mock('@thrive/shared', () => ({ supabaseClient: { from } }));

import { insertMoment, maisonMomentPayload, momentRow } from './persist';
import type { MomentPayload } from './flow';

beforeEach(() => {
  vi.clearAllMocks();
  insert.mockResolvedValue({ error: null });
});

describe('p3_moments : un seul écrivain', () => {
  it('insertMoment écrit les colonnes de la migration 062, rien d’autre', async () => {
    const p: MomentPayload = {
      activityId: 'ACT-0101', week: 1, duration_chosen: 20, duration_real_s: 1180, place: 'voiture',
      checkin: null, debrief: [{ kind: 'vecu', answer: 'a' }], capture: null, kept_phrase: 'une phrase', rating: 4, outcome: 'ACCROCHE',
    };
    await insertMoment('child-1', p);
    expect(from).toHaveBeenCalledWith('p3_moments');
    expect(insert).toHaveBeenCalledTimes(1);
    expect(Object.keys(insert.mock.calls[0][0]).sort()).toEqual(
      ['activity_id', 'capture', 'checkin', 'child_id', 'debrief', 'duration_chosen', 'duration_real_s', 'kept_phrase', 'outcome', 'place', 'rating', 'week'],
    );
    expect(insert.mock.calls[0][0]).toEqual(momentRow('child-1', p));
  });

  it('« C’est fait ? » de la Maison : mêmes colonnes et mêmes valeurs qu’avant (lieu maison, rien d’autre de renseigné)', async () => {
    await insertMoment('child-1', maisonMomentPayload({ activityId: 'ACT-0202', week: 2, duration: 10, outcome: 'MOYEN', keptPhrase: '  bien  ' }));
    const row = insert.mock.calls[0][0];
    // Les colonnes écrites par l'ancien recordMoment :
    expect(row).toMatchObject({
      child_id: 'child-1', activity_id: 'ACT-0202', week: 2, duration_chosen: 10, place: 'maison', outcome: 'MOYEN', kept_phrase: 'bien',
    });
    // Les autres colonnes restent nulles (comme si elles étaient omises : la table n'a pas de valeur par défaut pour elles).
    expect(row).toMatchObject({ duration_real_s: null, checkin: null, debrief: null, capture: null, rating: null });
  });

  it('phrase gardée vide : null', () => {
    expect(maisonMomentPayload({ activityId: 'ACT-0101', week: 1, duration: 30, outcome: 'ACCROCHE', keptPhrase: '   ' }).kept_phrase).toBeNull();
    expect(maisonMomentPayload({ activityId: 'ACT-0101', week: 1, duration: 30, outcome: 'ACCROCHE' }).kept_phrase).toBeNull();
  });

  it('une erreur de la base remonte (le repli papier / « Réessayer » reste côté écran)', async () => {
    insert.mockResolvedValue({ error: new Error('offline') });
    await expect(insertMoment('c', maisonMomentPayload({ activityId: 'ACT-0101', week: 1, duration: 10, outcome: 'ACCROCHE' }))).rejects.toThrow('offline');
  });

  it('aucun autre fichier de l’app n’écrit dans p3_moments', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const f = join(dir, name);
        if (statSync(f).isDirectory()) walk(f);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          const src = readFileSync(f, 'utf8');
          if (/from\(\s*['"]p3_moments['"]\s*\)\s*\.\s*(insert|upsert|update|delete)/.test(src.replace(/\s+/g, ' '))) hits.push(f);
        }
      }
    };
    walk(join(__dirname, '../..'));
    expect(hits.map((h) => h.split('/src/')[1])).toEqual(['components/activite/persist.ts']);
  });
});
