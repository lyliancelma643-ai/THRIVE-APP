import { useEffect, useState } from 'react';

/**
 * Vrai quand `waiting` dure plus de `ms` : un squelette ne reste jamais affiché sans issue.
 * L'écran propose alors « Réessayer » (voir LoadRetry) au lieu d'attendre indéfiniment.
 */
export function useStall(waiting: boolean, ms = 10_000, resetKey = 0): boolean {
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    setStalled(false);
    if (!waiting) return;
    const t = setTimeout(() => setStalled(true), ms);
    return () => clearTimeout(t);
  }, [waiting, ms, resetKey]);
  return stalled;
}
