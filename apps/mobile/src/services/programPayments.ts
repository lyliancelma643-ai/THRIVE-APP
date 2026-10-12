// Paiement des programmes (Groupe / Individuel / Complet) — côté app.
// Le client N'ENVOIE JAMAIS de montant : seulement { pack, mode } ; le serveur
// (edge function create-program-checkout) décide du montant, des taxes et des
// versements. Stripe Checkout s'ouvre dans le navigateur de l'app ; au retour on
// RELIT access_state() (jamais de calcul de droit ici).

import { OFFRES_PROGRAMMES_IN_APP } from '../lib/offresFlags';

export type ProgramPack = 'groupe' | 'individuel' | 'complet';
export type ProgramPaymentMode = 'deux_versements' | 'une_fois';

export type ProgramCheckoutResult =
  /** Le drapeau OFFRES_PROGRAMMES_IN_APP est faux : aucun appel réseau. */
  | { status: 'disabled' }
  /** Le navigateur est ouvert et le paiement n’est pas (encore) constaté. */
  | { status: 'opened' }
  /** Après le retour, access_state() montre un pack actif. */
  | { status: 'paid' }
  /** Le parent a fermé le navigateur sans payer. */
  | { status: 'cancelled' }
  | { status: 'error'; code: string; message: string };

export function isProgramPack(v: unknown): v is ProgramPack {
  return v === 'groupe' || v === 'individuel' || v === 'complet';
}

const GENERIC_ERROR = 'Le paiement n’a pas pu démarrer. Réessaie dans un instant.';

const ERROR_MESSAGES: Record<string, string> = {
  pack_active: 'Un programme THRIVE est déjà en cours sur ton compte.',
  already_enrolled: 'Une inscription est déjà en cours sur ton compte.',
  forbidden: 'Ce paiement est réservé au compte parent.',
  unauthorized: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
  validation: GENERIC_ERROR,
  not_configured: 'Le paiement n’est pas encore disponible. Ton coach peut t’envoyer un lien.',
};

export function programErrorMessage(code: string | null): string {
  return (code && ERROR_MESSAGES[code]) || GENERIC_ERROR;
}

/** Corps envoyé au serveur : exactement { pack, mode } (pack en MAJUSCULES), jamais de montant. */
export function toProgramCheckoutBody(pack: ProgramPack, mode: ProgramPaymentMode) {
  return { pack: pack.toUpperCase() as 'GROUPE' | 'INDIVIDUEL' | 'COMPLET', mode };
}

async function readErrorCode(error: unknown): Promise<string | null> {
  // FunctionsHttpError : la réponse HTTP est dans `context`.
  const ctx = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (!ctx || typeof ctx.json !== 'function') return null;
  try {
    const body = (await ctx.json()) as { code?: unknown } | null;
    return typeof body?.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

/** Relit access_state() (source de vérité) et dit si un pack est actif. */
async function packIsActiveAfterReturn(): Promise<boolean> {
  try {
    const { useSubscriptionStore } = await import('../stores/subscription.store');
    await useSubscriptionStore.getState().loadServerAccess();
    return useSubscriptionStore.getState().access?.packEnd != null;
  } catch {
    return false;
  }
}

/** Démarre le paiement d'un programme : Checkout serveur ouvert dans le navigateur de l'app. */
export async function startProgramCheckout(
  pack: ProgramPack,
  mode: ProgramPaymentMode,
): Promise<ProgramCheckoutResult> {
  if (!OFFRES_PROGRAMMES_IN_APP) return { status: 'disabled' };
  if (!isProgramPack(pack) || (mode !== 'deux_versements' && mode !== 'une_fois')) {
    return { status: 'error', code: 'validation', message: GENERIC_ERROR };
  }

  let url: string;
  try {
    const { supabaseClient } = await import('@thrive/shared');
    const { data, error } = await supabaseClient.functions.invoke('create-program-checkout', {
      body: toProgramCheckoutBody(pack, mode),
    });
    if (error) {
      const code = (await readErrorCode(error)) ?? 'internal';
      return { status: 'error', code, message: programErrorMessage(code) };
    }
    const u = (data as { url?: unknown } | null)?.url;
    if (typeof u !== 'string' || !u.startsWith('https://')) {
      return { status: 'error', code: 'internal', message: GENERIC_ERROR };
    }
    url = u;
  } catch {
    return { status: 'error', code: 'network', message: GENERIC_ERROR };
  }

  try {
    const WebBrowser = await import('expo-web-browser');
    const result = await WebBrowser.openBrowserAsync(url);
    if (await packIsActiveAfterReturn()) return { status: 'paid' };
    // Android renvoie « opened » dès l'ouverture : le paiement se constatera à la relecture suivante.
    return result.type === 'opened' ? { status: 'opened' } : { status: 'cancelled' };
  } catch {
    return { status: 'error', code: 'browser', message: GENERIC_ERROR };
  }
}
