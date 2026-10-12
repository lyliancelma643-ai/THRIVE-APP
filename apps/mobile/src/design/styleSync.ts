import { isStyleKey, type StyleKey } from './tokens';

/**
 * Synchro serveur du style de l'app (migration 083). AsyncStorage reste la
 * source immédiate ; le serveur ne fait que réconcilier au démarrage connecté
 * et recevoir les changements en tâche de fond. Toute erreur est avalée
 * (migration non appliquée, réseau coupé, session expirée) : le style local gagne.
 */

/** Sous-ensemble du client Supabase utilisé ici (injecté, donc testable). */
export type StyleSyncClient = {
  from: (table: 'profiles') => {
    select: (cols: 'ui_style') => {
      eq: (col: 'id', val: string) => {
        maybeSingle: () => PromiseLike<{ data: { ui_style?: unknown } | null; error: unknown }>;
      };
    };
  };
  rpc: (fn: 'set_ui_style', args: { p_style: StyleKey }) => PromiseLike<{ error: unknown }>;
};

export type MergeResult = {
  /** Style à afficher. */
  style: StyleKey | null;
  /** Écrire `style` dans le stockage local. */
  writeLocal: boolean;
  /** Pousser le style local vers le serveur (le serveur n'en a pas encore). */
  pushServer: boolean;
};

/**
 * Fusion local/serveur : un style serveur valide l'emporte et est réécrit
 * localement s'il diffère ; sans valeur serveur, le local est conservé et
 * poussé une fois s'il existe ; une valeur serveur invalide est ignorée.
 */
export function mergeStyle(local: unknown, server: unknown): MergeResult {
  const l = isStyleKey(local) ? local : null;
  const s = isStyleKey(server) ? server : null;
  if (s) return { style: s, writeLocal: s !== l, pushServer: false };
  return { style: l, writeLocal: false, pushServer: l !== null };
}

/** Lit le style serveur du parent connecté ; `null` si absent ou en cas d'erreur. */
export async function fetchServerStyle(client: StyleSyncClient, userId: string): Promise<StyleKey | null> {
  try {
    const { data, error } = await client.from('profiles').select('ui_style').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return isStyleKey(data.ui_style) ? data.ui_style : null;
  } catch {
    return null;
  }
}

/** Envoie le style au serveur en tâche de fond ; échec silencieux. */
export async function pushServerStyle(client: StyleSyncClient, style: StyleKey): Promise<void> {
  try {
    await client.rpc('set_ui_style', { p_style: style });
  } catch {
    /* le local reste la référence */
  }
}
