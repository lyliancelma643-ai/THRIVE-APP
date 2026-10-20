// Lancer : cd apps/mobile && ../web/node_modules/.bin/vitest run src/components/activite/persist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Base factice : p3_moments (insert + relecture des moments de l'enfant), p3_rewards (insert + relecture), p3_letters (insert).
const db = vi.hoisted(() => ({
  moments: [] as Record<string, unknown>[],
  rewards: [] as { reward_id: string; payload: unknown }[],
  rewardInserts: [] as Record<string, unknown>[],
  letters: [] as Record<string, unknown>[],
  rewardInsertError: null as { code: string } | null,
}));
const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { insert, from: vi.fn() };
});
vi.mock('@thrive/shared', () => ({ supabaseClient: { from } }));

import { insertMoment, maisonMomentPayload, momentRow, recordRewards, sealLetter } from './persist';
import { letterLine } from '../maison/objets/logic';
import type { MomentPayload } from './flow';

beforeEach(() => {
  vi.clearAllMocks();
  db.moments = [];
  db.rewards = [];
  db.rewardInserts = [];
  db.letters = [];
  db.rewardInsertError = null;
  insert.mockImplementation(async (row: Record<string, unknown>) => {
    db.moments.push({ ...row, created_at: new Date(1_760_000_000_000 + db.moments.length * 1000).toISOString() });
    return { error: null };
  });
  from.mockImplementation((table: string) => {
    if (table === 'p3_moments') return { insert, select: () => ({ eq: async () => ({ data: db.moments, error: null }) }) };
    if (table === 'p3_rewards') {
      return {
        select: () => ({ eq: async () => ({ data: db.rewards, error: null }) }),
        insert: async (row: Record<string, unknown>) => {
          if (db.rewardInsertError) return { error: db.rewardInsertError };
          db.rewardInserts.push(row);
          db.rewards.push({ reward_id: row.reward_id as string, payload: row.payload });
          return { error: null };
        },
      };
    }
    return { insert: async (row: Record<string, unknown>) => { db.letters.push(row); return { error: null }; } };
  });
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
    expect(db.rewardInserts).toEqual([]); // un seul moment : aucun objet gagné
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
    insert.mockImplementation(async () => ({ error: new Error('offline') }));
    await expect(insertMoment('c', maisonMomentPayload({ activityId: 'ACT-0101', week: 1, duration: 10, outcome: 'ACCROCHE' }))).rejects.toThrow('offline');
  });

  it('aucun autre fichier de l’app n’écrit dans p3_moments ni p3_rewards', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const f = join(dir, name);
        if (statSync(f).isDirectory()) walk(f);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
          const src = readFileSync(f, 'utf8');
          if (/from\(\s*['"]p3_moments['"]\s*\)\s*\.\s*(insert|upsert|update|delete)/.test(src.replace(/\s+/g, ' '))) hits.push(f);
          if (/from\(\s*['"]p3_rewards['"]\s*\)\s*\.\s*(insert|upsert|update|delete)/.test(src.replace(/\s+/g, ' '))) hits.push(f);
        }
      }
    };
    walk(join(__dirname, '../..'));
    expect([...new Set(hits.map((h) => h.split('/src/')[1]))]).toEqual(['components/activite/persist.ts']);
  });
});

describe('objets du carnet (p3_rewards) : écrits comme le web', () => {
  const week1 = ['ACT-0101', 'ACT-0102', 'ACT-0103'];
  const payloadFor = (id: string, forces: string[]): MomentPayload => ({
    activityId: id, week: 1, duration_chosen: 20, duration_real_s: null, place: 'maison', checkin: null, debrief: null,
    capture: id === 'ACT-0101' ? { kind: 'forces', items: forces } : null, kept_phrase: null, rating: 4, outcome: 'ACCROCHE',
  });

  it('la semaine 1 terminée gagne la Fiche Identité : (child_id, reward_id, payload) avec les forces notées', async () => {
    await insertMoment('child-1', payloadFor('ACT-0101', ['forceA', 'forceB']));
    await insertMoment('child-1', payloadFor('ACT-0102', []));
    expect(db.rewardInserts).toEqual([]); // semaine incomplète
    await insertMoment('child-1', payloadFor('ACT-0103', []));
    expect(db.rewardInserts).toEqual([
      { child_id: 'child-1', reward_id: 'fiche_identite', payload: { forces: ['forceA', 'forceB'], choix: [], reve: [] } },
    ]);
  });

  it('idempotent : un objet déjà gagné n’est pas réécrit, un conflit (23505) est ignoré', async () => {
    for (const id of week1) await insertMoment('child-1', payloadFor(id, ['f']));
    expect(db.rewardInserts).toHaveLength(1);
    expect(await recordRewards('child-1')).toEqual([]); // relu : déjà gagné
    db.rewards = [];
    db.rewardInsertError = { code: '23505' };
    expect(await recordRewards('child-1')).toEqual(['fiche_identite']); // conflit = déjà là, sans erreur
  });

  it('l’échec de l’écriture des objets ne fait pas échouer le moment', async () => {
    db.rewardInsertError = { code: '42501' };
    for (const id of week1) await expect(insertMoment('child-1', payloadFor(id, ['f']))).resolves.toBeUndefined();
    expect(db.moments).toHaveLength(3);
  });

  it('lettre scellée : l’objet « La lettre » porte la date de scellement (jamais le texte) et l’écran la dit scellée', async () => {
    const now = new Date(Date.UTC(2026, 9, 13, 18, 0, 0));
    const at = await sealLetter('child-1', 'Cher moi de l’an prochain', now);
    expect(at).toBe(now.getTime());
    expect(db.letters).toEqual([{ child_id: 'child-1', author: 'ENFANT', body: 'Cher moi de l’an prochain' }]);
    expect(db.rewardInserts).toEqual([{ child_id: 'child-1', reward_id: 'lettre_un_an', payload: { sealed_at: now.toISOString() } }]);
    expect(JSON.stringify(db.rewardInserts)).not.toContain('Cher moi');
    const line = letterLine(db.rewardInserts[0].payload as Record<string, unknown>, 'Prénom');
    expect(line).toMatch(/^Lettre scellée le /);
    expect(line).not.toMatch(/sur papier/);
  });

  it('lettre vide : rien n’est écrit', async () => {
    await expect(sealLetter('child-1', '   ')).rejects.toThrow('empty-letter');
    expect(db.rewardInserts).toEqual([]);
  });
});
