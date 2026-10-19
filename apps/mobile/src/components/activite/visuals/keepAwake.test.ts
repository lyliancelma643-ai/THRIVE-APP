import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: vi.fn(() => Promise.resolve()),
  deactivateKeepAwake: vi.fn(() => Promise.resolve()),
}));

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ACTIVITY_KEEP_AWAKE_TAG, holdScreenAwake } from './keepAwake';

beforeEach(() => vi.clearAllMocks());

describe('E1 · écran allumé pendant le mode activité', () => {
  it('active à l’entrée et relâche à la sortie (expo-keep-awake, avec l’étiquette du mode activité)', () => {
    const release = holdScreenAwake();
    expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(1);
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(ACTIVITY_KEEP_AWAKE_TAG);
    expect(deactivateKeepAwake).not.toHaveBeenCalled();
    release();
    expect(deactivateKeepAwake).toHaveBeenCalledTimes(1);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(ACTIVITY_KEEP_AWAKE_TAG);
  });

  it('une erreur native n’interrompt jamais l’activité', async () => {
    const api = { activate: vi.fn(() => Promise.reject(new Error('indisponible'))), deactivate: vi.fn(() => { throw new Error('boom'); }) };
    const release = holdScreenAwake(api, 't');
    await Promise.resolve();
    expect(() => release()).not.toThrow();
    expect(api.activate).toHaveBeenCalledWith('t');
    expect(api.deactivate).toHaveBeenCalledWith('t');
  });

  it('la route du mode activité l’appelle (et monte la feuille des visuels)', () => {
    const route = readFileSync(join(__dirname, '../../../app/(parent)/moment/[activityId].tsx'), 'utf8');
    expect(route).toContain('useActivityKeepAwake();');
    expect(route).toContain('<VisualSheet');
    expect(route).toContain('onShowVisual={setVisual}');
  });
});
