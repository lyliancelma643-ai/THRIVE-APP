/**
 * « La dernière lecture gagne » : chaque lecture reçoit un jeton ; une réponse arrivée après une lecture plus récente,
 * après `cancel()` (changement d'enfant, onglet quitté) ou après `dispose()` (écran démonté) est ignorée, et sa
 * requête réseau est annulée (AbortController) quand c'est possible. Jamais d'état écrasé par une réponse périmée.
 */
export type RequestTicket = {
  readonly id: number;
  /** Vrai si une lecture plus récente a commencé, ou si la lecture a été annulée / l'écran démonté. */
  readonly stale: boolean;
  /** À passer à `.abortSignal()` (supabase-js) ou à `fetch`. Absent si AbortController n'existe pas. */
  readonly signal: AbortSignal | undefined;
};

export function createRequestGate() {
  let current = 0;
  let disposed = false;
  let controller: AbortController | null = null;
  const abort = () => {
    try {
      controller?.abort();
    } catch {
      // annulation impossible : la réponse sera simplement ignorée
    }
    controller = null;
  };
  return {
    begin(): RequestTicket {
      abort();
      const id = ++current;
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      controller = ctrl;
      return {
        id,
        get stale() {
          return disposed || id !== current;
        },
        signal: ctrl?.signal,
      };
    },
    /** Rend périmées toutes les lectures en cours (sans bloquer les suivantes). */
    cancel() {
      current++;
      abort();
    },
    dispose() {
      disposed = true;
      current++;
      abort();
    },
  };
}

export type RequestGate = ReturnType<typeof createRequestGate>;
