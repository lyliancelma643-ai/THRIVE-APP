import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const focus = vi.hoisted(() => ({ effect: null as null | (() => void | (() => void)) }));
vi.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    focus.effect = cb;
  },
}));
vi.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: vi.fn(() => Promise.resolve()),
  deactivateKeepAwake: vi.fn(() => Promise.resolve()),
}));

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ACTIVITY_KEEP_AWAKE_TAG, flowResetKey, holdScreenAwake, useActivityKeepAwake } from './keepAwake';

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

  it('suit le focus : verrou pris à la prise de focus, relâché à la perte de focus (l’onglet reste monté)', () => {
    useActivityKeepAwake();
    expect(focus.effect).toBeTypeOf('function');
    const cleanup = focus.effect!() as () => void; // prise de focus
    expect(activateKeepAwakeAsync).toHaveBeenCalledWith(ACTIVITY_KEEP_AWAKE_TAG);
    expect(deactivateKeepAwake).not.toHaveBeenCalled();
    cleanup(); // perte de focus (ou démontage)
    expect(deactivateKeepAwake).toHaveBeenCalledTimes(1);
    expect(deactivateKeepAwake).toHaveBeenCalledWith(ACTIVITY_KEEP_AWAKE_TAG);
    focus.effect!(); // nouveau moment : le verrou est repris
    expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(2);
  });

  it('un nouveau moment repart à zéro : la clé du flot change à chaque entrée et à chaque changement de paramètres', () => {
    const p = ['ACT-0401', 'child-1', '8-11', '10', undefined];
    expect(flowResetKey(0, p)).toBe(flowResetKey(0, p));
    expect(flowResetKey(1, p)).not.toBe(flowResetKey(0, p));
    expect(flowResetKey(0, ['ACT-0402', ...p.slice(1)])).not.toBe(flowResetKey(0, p));
  });

  it('la route du mode activité l’appelle (et monte la feuille des visuels)', () => {
    const route = readFileSync(join(__dirname, '../../../app/(parent)/moment/[activityId].tsx'), 'utf8');
    expect(route).toContain('useActivityKeepAwake();');
    expect(route).toContain('<VisualSheet');
    // retour Android et réinitialisation liés au focus, jamais au seul montage
    expect(route).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*const sub = BackHandler/);
    expect(route).toContain('flowResetKey(entry,');
    expect(route).toContain('onShowVisual={setVisual}');
  });
});
