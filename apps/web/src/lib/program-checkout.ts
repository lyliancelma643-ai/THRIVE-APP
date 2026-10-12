import { supabaseClient as supabase } from '@thrive/shared';
import type { ProgramMode, ProgramPack } from './program-packs';

// Appel de create-program-checkout (GO 3 · O2). Le corps est EXACTEMENT
// { pack, mode, origin } : jamais de montant (le serveur décide, Zod strict).

export class ProgramCheckoutError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  pack_active: 'Un programme THRIVE est déjà en cours sur ton compte.',
  already_enrolled: 'Une inscription est déjà en cours sur ton compte.',
  forbidden: 'Ce paiement est réservé au compte parent.',
  unauthorized: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
  not_configured: 'Le paiement en ligne ouvre très bientôt. Ton coach peut aussi t’envoyer un lien.',
};
const GENERIC = 'Le paiement ne s’ouvre pas pour le moment. Réessaie dans un instant.';

export function programCheckoutMessage(code: string | null | undefined): string {
  return (code && MESSAGES[code]) || GENERIC;
}

export function toCheckoutBody(pack: ProgramPack, mode: ProgramMode, origin: string) {
  return { pack, mode, origin };
}

/** Crée la session Checkout et renvoie son URL (la redirection est faite par l'appelant). */
export async function createProgramCheckout(pack: ProgramPack, mode: ProgramMode): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-program-checkout', {
    body: toCheckoutBody(pack, mode, window.location.origin),
  });
  if (error) {
    let code = 'internal';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const payload = await ctx.json().catch(() => null);
      if (payload?.code) code = String(payload.code);
    }
    throw new ProgramCheckoutError(programCheckoutMessage(code), code);
  }
  const url = (data as { url?: unknown } | null)?.url;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new ProgramCheckoutError(GENERIC, 'internal');
  }
  return url;
}

/** Lien de paiement créé par un admin pour un parent (ADMIN / SUPER_ADMIN). */
export async function createAdminProgramLink(
  parentId: string,
  pack: ProgramPack,
  mode: ProgramMode,
): Promise<{ url: string; expires_at: string | null }> {
  const { data, error } = await supabase.functions.invoke('admin-create-program-link', {
    body: { parent_id: parentId, pack, mode },
  });
  if (error) {
    let code = 'internal';
    let message = GENERIC;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const payload = await ctx.json().catch(() => null);
      if (payload?.code) code = String(payload.code);
      if (payload?.message) message = String(payload.message);
    }
    throw new ProgramCheckoutError(message, code);
  }
  const d = data as { url?: unknown; expires_at?: unknown } | null;
  if (typeof d?.url !== 'string') throw new ProgramCheckoutError(GENERIC, 'internal');
  return { url: d.url, expires_at: typeof d.expires_at === 'string' ? d.expires_at : null };
}
