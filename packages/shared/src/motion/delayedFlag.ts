import { useEffect, useRef, useState } from 'react';
import { THRESH } from './tokens';

export type DelayedFlagOptions = { delay?: number; minShow?: number };

/**
 * Anti-clignotement : `true` seulement si l'attente dure plus de `delay` ; une fois affiché, reste affiché au moins
 * `minShow`. Version pure (testable avec des minuteurs simulés) ; `useDelayedFlag` en est l'enrobage React.
 */
export function createDelayedFlag(opts: DelayedFlagOptions, onChange: (shown: boolean) => void) {
  const delay = opts.delay ?? THRESH.skeletonDelay;
  const minShow = opts.minShow ?? THRESH.skeletonMinShow;
  let shown = false;
  let shownAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    set(pending: boolean) {
      clear();
      if (pending) {
        if (shown) return;
        timer = setTimeout(() => {
          timer = null;
          shown = true;
          shownAt = Date.now();
          onChange(true);
        }, delay);
      } else if (shown) {
        const wait = Math.max(0, minShow - (Date.now() - shownAt));
        timer = setTimeout(() => {
          timer = null;
          shown = false;
          onChange(false);
        }, wait);
      }
    },
    dispose: clear,
  };
}

export function useDelayedFlag(isPending: boolean, opts: DelayedFlagOptions = {}): boolean {
  const [shown, setShown] = useState(false);
  const ref = useRef<ReturnType<typeof createDelayedFlag> | null>(null);
  if (!ref.current) ref.current = createDelayedFlag(opts, setShown);
  useEffect(() => {
    ref.current?.set(isPending);
  }, [isPending]);
  useEffect(() => () => ref.current?.dispose(), []);
  return shown;
}
