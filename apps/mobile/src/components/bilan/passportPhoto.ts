import * as ImagePicker from 'expo-image-picker';
import { supabaseClient as supabase } from '@thrive/shared';

// Photo du passeport (J) : choix dans la photothèque, puis envoi dans le MÊME stockage et au MÊME chemin que le web
// (`apps/web/src/lib/avatar.ts`, qui fait foi). Bucket PRIVÉ `child-avatars` (photos de mineurs : jamais public, migration 052 :
// 5 Mo max, jpeg / png / webp), chemin `<child_id>/avatar-<horodatage>.jpg`, `children.avatar_url` = ce CHEMIN (l'affichage passe
// par une URL signée, `resolveAvatarUrl`). L'accès à la photothèque n'est demandé qu'au geste « Changer la photo », jamais avant.

export const AVATAR_BUCKET = 'child-avatars';
/** Limite du bucket (migration 052) : 5 Mo. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type PhotoType = (typeof ALLOWED_PHOTO_TYPES)[number];

export type PickedPhoto = { uri: string; mimeType?: string | null; fileSize?: number | null };

export type PhotoFailure = 'denied' | 'type' | 'size' | 'read' | 'upload' | 'save';

/** Phrases calmes affichées sous le bouton (jamais le message technique de la base). */
export const PHOTO_MESSAGES: Record<PhotoFailure, string> = {
  denied: 'Pour choisir une photo, autorise l’accès aux photos dans les réglages de ton téléphone.',
  type: 'Cette image n’est pas dans un format accepté (JPEG, PNG ou WebP).',
  size: 'Cette photo est trop lourde (5 Mo au plus). Choisis-en une plus légère.',
  read: 'Cette photo n’a pas pu être lue. Essaie-en une autre.',
  upload: 'La photo n’a pas pu être envoyée. Vérifie ta connexion, puis réessaie.',
  save: 'La photo a été envoyée mais pas enregistrée. Réessaie dans un instant.',
};

export type PickResult =
  | { status: 'ok'; photo: PickedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'error' };

/** Type MIME de la photo : celui du sélecteur, sinon déduit de l'extension. */
export function photoType(p: Pick<PickedPhoto, 'uri' | 'mimeType'>): PhotoType | null {
  const declared = p.mimeType?.toLowerCase();
  if (declared) return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(declared) ? (declared as PhotoType) : null;
  const ext = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(p.uri)?.[1]?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

/** Contrôle avant envoi : format accepté et poids connu ≤ 5 Mo. (Le poids réel est recontrôlé après lecture.) */
export function checkPhoto(p: PickedPhoto): PhotoFailure | null {
  if (!photoType(p)) return 'type';
  if (p.fileSize != null && p.fileSize > MAX_PHOTO_BYTES) return 'size';
  return null;
}

/** Chemin de stockage : `<child_id>/avatar-<horodatage>.jpg` (comme le web ; png / webp gardent leur extension). */
export function photoPath(childId: string, now: number, type: PhotoType): string {
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return `${childId}/avatar-${now}.${ext}`;
}

type PickerLib = Pick<typeof ImagePicker, 'requestMediaLibraryPermissionsAsync' | 'launchImageLibraryAsync'>;

/**
 * Demande l'accès aux photos AU GESTE (jamais au chargement), puis ouvre la photothèque avec un recadrage carré. Un refus
 * renvoie `denied` sans lever d'exception ; l'annulation n'est pas une erreur.
 */
export async function pickPassportPhoto(picker: PickerLib = ImagePicker): Promise<PickResult> {
  try {
    const perm = await picker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { status: 'denied', canAskAgain: perm.canAskAgain !== false };
    const res = await picker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      exif: false,
    });
    if (res.canceled || !res.assets?.length) return { status: 'cancelled' };
    const a = res.assets[0];
    return { status: 'ok', photo: { uri: a.uri, mimeType: a.mimeType ?? null, fileSize: a.fileSize ?? null } };
  } catch {
    return { status: 'error' };
  }
}

export type PhotoDeps = {
  client: Pick<typeof supabase, 'from' | 'storage'>;
  readBytes: (uri: string) => Promise<ArrayBuffer>;
  now: () => number;
};

const defaultDeps = (): PhotoDeps => ({
  client: supabase,
  readBytes: async (uri) => (await fetch(uri)).arrayBuffer(),
  now: () => Date.now(),
});

export type UploadResult = { ok: true; path: string } | { ok: false; failure: PhotoFailure };

/**
 * Envoie la photo dans `child-avatars`, enregistre le chemin sur la fiche de l'enfant (la RLS limite aux parents de l'enfant),
 * puis retire l'ancien fichier (nettoyage silencieux). Si la fiche ne suit pas, le fichier tout juste envoyé est retiré :
 * aucune photo d'enfant orpheline dans le stockage.
 */
export async function uploadPassportPhoto(childId: string, photo: PickedPhoto, deps: PhotoDeps = defaultDeps()): Promise<UploadResult> {
  const early = checkPhoto(photo);
  if (early) return { ok: false, failure: early };
  const type = photoType(photo) as PhotoType;

  let bytes: ArrayBuffer;
  try {
    bytes = await deps.readBytes(photo.uri);
  } catch {
    return { ok: false, failure: 'read' };
  }
  if (bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, failure: 'size' };
  if (bytes.byteLength === 0) return { ok: false, failure: 'read' };

  const { data: before } = await deps.client.from('children').select('avatar_url').eq('id', childId).maybeSingle();
  const oldPath = (before as { avatar_url?: string | null } | null)?.avatar_url ?? null;

  const path = photoPath(childId, deps.now(), type);
  const up = await deps.client.storage.from(AVATAR_BUCKET).upload(path, bytes, { contentType: type, upsert: false });
  if (up.error) return { ok: false, failure: 'upload' };

  const { error } = await deps.client.from('children').update({ avatar_url: path, updated_at: new Date(deps.now()).toISOString() }).eq('id', childId);
  if (error) {
    await deps.client.storage.from(AVATAR_BUCKET).remove([path]);
    return { ok: false, failure: 'save' };
  }
  await removeStoredPhoto(oldPath, deps);
  return { ok: true, path };
}

/** « Retirer la photo » : la fiche d'abord, puis le fichier. Renvoie false si la fiche n'a pas été mise à jour. */
export async function removePassportPhoto(childId: string, deps: PhotoDeps = defaultDeps()): Promise<boolean> {
  const { data: before } = await deps.client.from('children').select('avatar_url').eq('id', childId).maybeSingle();
  const oldPath = (before as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  const { error } = await deps.client.from('children').update({ avatar_url: null, updated_at: new Date(deps.now()).toISOString() }).eq('id', childId);
  if (error) return false;
  await removeStoredPhoto(oldPath, deps);
  return true;
}

async function removeStoredPhoto(path: string | null, deps: PhotoDeps): Promise<void> {
  // Les anciennes valeurs http(s) ne sont pas dans le stockage : rien à retirer. Jamais bloquant.
  if (!path || /^https?:\/\//i.test(path)) return;
  try {
    await deps.client.storage.from(AVATAR_BUCKET).remove([path]);
  } catch {
    /* nettoyage silencieux */
  }
}
