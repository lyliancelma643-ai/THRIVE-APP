import { parseStyle } from './styleMigration';
import type { StyleKey } from './tokens';

/**
 * Synchro serveur du style de l'app (migration 083). AsyncStorage reste la
 * source immédiate ; le serveur ne fait que réconcilier au démarrage connecté
 * et recevoir les changements en tâche de fond. Toute erreur est avalée
 * (migration non appliquée, réseau coupé, session expirée) : le style local gagne.
 * Les valeurs lues (locales ou serveur) passent toutes par `parseStyle()` : une ancienne
 * valeur est convertie en `lin` / `veillee`, une valeur inconnue est ignorée.
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
  /** Écrire `style` dans le stockage local (valeur absente, différente ou à l'ancien format). */
  writeLocal: boolean;
  /** Pousser le style local vers le serveur (le serveur n'en a pas encore). */
  pushServer: boolean;
};

/**
 * Fusion local/serveur : un style serveur valide l'emporte et est réécrit
 * localement s'il diffère de la valeur brute stockée (y compris une ancienne clé, migrée au passage) ;
 * sans valeur serveur, le local est conservé (et réécrit s'il était à l'ancien format) puis
 * poussé une fois s'il existe ; une valeur serveur invalide est ignorée.
 */
export function mergeStyle(local: unknown, server: unknown): MergeResult {
  const l = parseStyle(local);
  const s = parseStyle(server);
  if (s) return { style: s, writeLocal: local !== s, pushServer: false };
  return { style: l, writeLocal: l !== null && local !== l, pushServer: l !== null };
}

/** Lit le style serveur du parent connecté ; `null` si absent ou en cas d'erreur. */
export async function fetchServerStyle(client: StyleSyncClient, userId: string): Promise<StyleKey | null> {
  try {
    const { data, error } = await client.from('profiles').select('ui_style').eq('id', userId).maybeSingle();
    if (error || !data) return null;
    return parseStyle(data.ui_style);
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
