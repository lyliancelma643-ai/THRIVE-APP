// Photo de profil enfant + personnalisation du passeport athlète.
// Bucket privé `child-avatars` (photos de mineurs → jamais public) :
// children.avatar_url stocke le CHEMIN storage (`<child_id>/avatar-….jpg`),
// l'affichage passe par une URL signée. Les anciennes valeurs http(s) restent
// affichées telles quelles (rétro-compatibilité).

import { supabaseClient as supabase } from '@thrive/shared';

export const AVATAR_BUCKET = 'child-avatars';

// Préréglages de couleur du passeport (clé stockée en base, contrainte SQL).
export const ACCENT_PRESETS: { key: string; hex: string; label: string }[] = [
  { key: 'sun', hex: '#F9EB50', label: 'Soleil' },
  { key: 'amber', hex: '#F6B45A', label: 'Ambre' },
  { key: 'teal', hex: '#A7C4BC', label: 'Sauge' },
  { key: 'sky', hex: '#6EC1E4', label: 'Ciel' },
  { key: 'coral', hex: '#F58A7E', label: 'Corail' },
  { key: 'violet', hex: '#B79CE4', label: 'Violet' },
];

export function accentHex(key: string | null | undefined): string {
  return ACCENT_PRESETS.find((p) => p.key === key)?.hex ?? '#F9EB50';
}

export async function resolveAvatarUrl(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw; // legacy : URL directe
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(raw, 3600);
  return data?.signedUrl ?? null;
}

// Recadre au carré centré et réduit à 512 px → JPEG léger, peu importe la
// taille de la photo prise au téléphone.
async function squareJpeg(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image illisible'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(size, side);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas indisponible');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    if (!blob) throw new Error('encodage impossible');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadChildAvatar(
  childId: string,
  file: File
): Promise<{ path?: string; error?: string }> {
  let blob: Blob;
  try {
    blob = await squareJpeg(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'photo illisible' };
  }
  const path = `${childId}/avatar-${Date.now()}.jpg`;
  const up = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) return { error: up.error.message };
  return { path };
}

export async function deleteChildAvatarFile(path: string | null | undefined): Promise<void> {
  // Nettoyage silencieux de l'ancien fichier (jamais bloquant pour l'usager).
  if (path && !/^https?:\/\//i.test(path)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  }
}

export type PassportPatch = {
  avatar_url?: string | null;
  nickname?: string | null;
  jersey_number?: number | null;
  accent_color?: string | null;
};

export async function saveChildPassport(
  childId: string,
  patch: PassportPatch
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('children')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', childId);
  return error ? { error: error.message } : {};
}
