// Lancer : cd apps/mobile && ../web/node_modules/.bin/vitest run src/components/bilan/passportPhoto
import { describe, expect, it, vi } from 'vitest';

vi.mock('@thrive/shared', () => ({ supabaseClient: {} }));
vi.mock('expo-image-picker', () => ({}));

import {
  ALLOWED_PHOTO_TYPES, AVATAR_BUCKET, MAX_PHOTO_BYTES, PHOTO_MESSAGES, checkPhoto, photoPath, photoType, pickPassportPhoto,
  removePassportPhoto, uploadPassportPhoto, type PhotoDeps,
} from './passportPhoto';

const CHILD = '8c2e2f2a-0000-4000-8000-000000000001';

function fakeClient(opts: { oldPath?: string | null; uploadError?: boolean; updateError?: boolean } = {}) {
  const calls: { op: string; arg?: unknown; bucket?: string }[] = [];
  const client = {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { avatar_url: opts.oldPath ?? null } }) }) }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          calls.push({ op: `update:${table}:${id}`, arg: patch });
          return { error: opts.updateError ? { message: 'rls' } : null };
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _b: ArrayBuffer, o: { contentType: string; upsert: boolean }) => {
          calls.push({ op: 'upload', arg: { path, ...o }, bucket });
          return { error: opts.uploadError ? { message: 'x' } : null };
        },
        remove: async (paths: string[]) => {
          calls.push({ op: 'remove', arg: paths, bucket });
          return { error: null };
        },
      }),
    },
  };
  return { client: client as unknown as PhotoDeps['client'], calls };
}

const deps = (client: PhotoDeps['client'], bytes = 1000): PhotoDeps => ({ client, readBytes: async () => new ArrayBuffer(bytes), now: () => 1_760_000_000_000 });

describe('photo du passeport : mêmes règles que le web (bucket privé child-avatars)', () => {
  it('bucket, limite et formats = migration 052', () => {
    expect(AVATAR_BUCKET).toBe('child-avatars');
    expect(MAX_PHOTO_BYTES).toBe(5_242_880);
    expect([...ALLOWED_PHOTO_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('chemin <child_id>/avatar-<horodatage>.jpg', () => {
    expect(photoPath(CHILD, 123, 'image/jpeg')).toBe(`${CHILD}/avatar-123.jpg`);
    expect(photoPath(CHILD, 123, 'image/png')).toBe(`${CHILD}/avatar-123.png`);
  });

  it('type : déclaré par le sélecteur, sinon déduit de l’extension ; le reste est refusé', () => {
    expect(photoType({ uri: 'file:///a.heic', mimeType: 'image/heic' })).toBeNull();
    expect(photoType({ uri: 'file:///a.JPG' })).toBe('image/jpeg');
    expect(photoType({ uri: 'file:///a.gif' })).toBeNull();
    expect(checkPhoto({ uri: 'file:///a.jpg', mimeType: 'image/gif' })).toBe('type');
    expect(checkPhoto({ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: MAX_PHOTO_BYTES + 1 })).toBe('size');
    expect(checkPhoto({ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: MAX_PHOTO_BYTES })).toBeNull();
  });
});

describe('permission demandée au geste, refus géré', () => {
  it('refus : status denied, sans ouvrir la photothèque ni lever d’exception', async () => {
    const launch = vi.fn();
    const r = await pickPassportPhoto({ requestMediaLibraryPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) as never, launchImageLibraryAsync: launch });
    expect(r).toEqual({ status: 'denied', canAskAgain: false });
    expect(launch).not.toHaveBeenCalled();
    expect(PHOTO_MESSAGES.denied).toMatch(/réglages/);
  });

  it('annulation : pas une erreur ; exception du module natif : status error', async () => {
    const granted = async () => ({ granted: true }) as never;
    expect(await pickPassportPhoto({ requestMediaLibraryPermissionsAsync: granted, launchImageLibraryAsync: async () => ({ canceled: true, assets: null }) as never })).toEqual({ status: 'cancelled' });
    expect(await pickPassportPhoto({ requestMediaLibraryPermissionsAsync: async () => { throw new Error('native'); }, launchImageLibraryAsync: vi.fn() })).toEqual({ status: 'error' });
  });

  it('photo choisie : recadrage carré, sans EXIF', async () => {
    const launch = vi.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///p.jpg', mimeType: 'image/jpeg', fileSize: 1234 }] }));
    const r = await pickPassportPhoto({ requestMediaLibraryPermissionsAsync: async () => ({ granted: true }) as never, launchImageLibraryAsync: launch as never });
    expect(r).toEqual({ status: 'ok', photo: { uri: 'file:///p.jpg', mimeType: 'image/jpeg', fileSize: 1234 } });
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], exif: false }));
  });
});

describe('envoi', () => {
  it('envoie dans child-avatars (privé, sans écrasement), enregistre le chemin, retire l’ancien fichier', async () => {
    const { client, calls } = fakeClient({ oldPath: `${CHILD}/avatar-1.jpg` });
    const r = await uploadPassportPhoto(CHILD, { uri: 'file:///p.jpg', mimeType: 'image/jpeg' }, deps(client));
    const path = `${CHILD}/avatar-1760000000000.jpg`;
    expect(r).toEqual({ ok: true, path });
    expect(calls[0]).toEqual({ op: 'upload', bucket: 'child-avatars', arg: { path, contentType: 'image/jpeg', upsert: false } });
    expect(calls[1].op).toBe(`update:children:${CHILD}`);
    expect(calls[1].arg).toMatchObject({ avatar_url: path });
    expect(calls[2]).toEqual({ op: 'remove', bucket: 'child-avatars', arg: [`${CHILD}/avatar-1.jpg`] });
  });

  it('format refusé ou trop lourd : rien n’est envoyé', async () => {
    const { client, calls } = fakeClient();
    expect(await uploadPassportPhoto(CHILD, { uri: 'file:///p.gif', mimeType: 'image/gif' }, deps(client))).toEqual({ ok: false, failure: 'type' });
    expect(await uploadPassportPhoto(CHILD, { uri: 'file:///p.jpg', mimeType: 'image/jpeg', fileSize: MAX_PHOTO_BYTES + 1 }, deps(client))).toEqual({ ok: false, failure: 'size' });
    expect(await uploadPassportPhoto(CHILD, { uri: 'file:///p.jpg', mimeType: 'image/jpeg' }, deps(client, MAX_PHOTO_BYTES + 1))).toEqual({ ok: false, failure: 'size' });
    expect(calls).toEqual([]);
  });

  it('fiche non mise à jour : le fichier tout juste envoyé est retiré (aucune photo d’enfant orpheline)', async () => {
    const { client, calls } = fakeClient({ updateError: true, oldPath: `${CHILD}/avatar-1.jpg` });
    const r = await uploadPassportPhoto(CHILD, { uri: 'file:///p.jpg', mimeType: 'image/jpeg' }, deps(client));
    expect(r).toEqual({ ok: false, failure: 'save' });
    expect(calls.at(-1)).toEqual({ op: 'remove', bucket: 'child-avatars', arg: [`${CHILD}/avatar-1760000000000.jpg`] });
    expect(calls.some((c) => c.op === 'remove' && JSON.stringify(c.arg).includes('avatar-1.jpg'))).toBe(false); // l’ancienne photo reste
  });

  it('envoi refusé par le stockage : message calme, la fiche n’est pas touchée', async () => {
    const { client, calls } = fakeClient({ uploadError: true });
    expect(await uploadPassportPhoto(CHILD, { uri: 'file:///p.jpg', mimeType: 'image/jpeg' }, deps(client))).toEqual({ ok: false, failure: 'upload' });
    expect(calls.some((c) => c.op.startsWith('update'))).toBe(false);
  });

  it('retirer la photo : la fiche passe à null puis le fichier est retiré (anciennes URL http ignorées)', async () => {
    const a = fakeClient({ oldPath: `${CHILD}/avatar-1.jpg` });
    expect(await removePassportPhoto(CHILD, deps(a.client))).toBe(true);
    expect(a.calls[0].arg).toMatchObject({ avatar_url: null });
    expect(a.calls[1]).toEqual({ op: 'remove', bucket: 'child-avatars', arg: [`${CHILD}/avatar-1.jpg`] });
    const b = fakeClient({ oldPath: 'https://exemple.test/x.jpg' });
    expect(await removePassportPhoto(CHILD, deps(b.client))).toBe(true);
    expect(b.calls.some((c) => c.op === 'remove')).toBe(false);
  });
});
