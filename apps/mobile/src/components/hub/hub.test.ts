import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) },
}));

import { WEB_PALETTES, ambianceFor, webPalette } from '../../design/web/palette';
import { mobileTargetForPath } from '../bilan/notificationRoute';
import { addRefusal, excludeTonight, popWeekDone, pushWeekDone, readEvening } from './session';

describe('ambiances du web dans l’app', () => {
  it('Veillée = Nuit calme, Lin = Jour clair', () => {
    expect(ambianceFor('veillee')).toBe('night');
    expect(ambianceFor('lin')).toBe('day');
  });
  it('mêmes jetons que globals.css du web (fond, surface, accent)', () => {
    expect(webPalette('veillee').bg).toBe('#06161E');
    expect(webPalette('veillee').surface).toBe('#0C2029');
    expect(webPalette('lin').bg).toBe('#F2EFE9');
    expect(webPalette('lin').accentInk).toBe('#004E7A');
    // Surface Maison (« Soir de famille ») : marine profond la nuit, crème le jour.
    expect(webPalette('veillee', 'maison').bg).toBe('#022539');
    expect(webPalette('lin', 'maison').bg).toBe('#F7F5F2');
  });
  it('le jaune reste la couleur d’action dans les deux ambiances', () => {
    for (const a of ['night', 'day'] as const) expect(WEB_PALETTES[a].base.accent).toBe('#F9EB50');
  });
});

describe('notifications → écrans de l’app', () => {
  it('un message ouvre le bon fil (?c=)', () => {
    expect(mobileTargetForPath('/parent/messages?c=abc')).toEqual({ pathname: '/(parent)/chat/[conversationId]', params: { conversationId: 'abc' } });
    expect(mobileTargetForPath('/parent/messages')).toEqual({ pathname: '/(parent)/messages' });
  });
  it('les pages Maison ont leur écran', () => {
    expect(mobileTargetForPath('/parent/fitness/carnet')?.pathname).toBe('/(parent)/carnet');
    expect(mobileTargetForPath('/parent/fitness/programme')?.pathname).toBe('/(parent)/programme');
  });
  it('jamais de page d’achat du site (anti-steering)', () => {
    expect(mobileTargetForPath('/parent/upgrade')).toBeNull();
  });
});

describe('état de la soirée (session du web)', () => {
  it('écarter et refuser s’additionnent, sans doublon', () => {
    const id = 'enfant-test';
    expect(readEvening(id)).toMatchObject({ excluded: [], refusals: 0 });
    excludeTonight(id, 'A');
    excludeTonight(id, 'A');
    const e = addRefusal(id, 'B');
    expect(e.excluded).toEqual(['A', 'B']);
    expect(e.refusals).toBe(1);
  });
  it('« Semaine N complète » est lu une seule fois', () => {
    pushWeekDone('x', 4);
    expect(popWeekDone('x')).toBe(4);
    expect(popWeekDone('x')).toBeNull();
  });
});
