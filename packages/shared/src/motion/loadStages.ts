import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THRESH } from './tokens';

export type Stage = { key: string; label: string };

export type LoadStagesState = {
  /** Marches allumées à l'écran (contiguës depuis le début). */
  index: number;
  total: number;
  done: boolean;
  /** L'écran de chargement doit-il s'afficher ? Faux si tout finit avant 400 ms. */
  visible: boolean;
  slow: boolean;
  canRetry: boolean;
  failed: string | null;
};

export type LoadStagesOptions = {
  onDone?: () => void;
  onRetry?: () => void;
  /** Durée d'affichage minimale par marche (affichage seulement). */
  dwell?: number;
  /** L'affichage ne retarde jamais la suite de plus que ça, au total. */
  maxCatchUp?: number;
  /** Sous ce délai, on n'affiche rien du tout. */
  showAfter?: number;
  slowAfter?: number;
  retryAfter?: number;
  /** Durée minimale de l'écran de chargement (depuis `start`) : la fin est retenue jusque-là. */
  minTotal?: number;
};

/**
 * Moteur de l'escalier. Les événements réels (`markDone`) arrivent dans le désordre ; `index` compte les étapes
 * contiguës terminées. Si plusieurs arrivent d'un coup, les marches s'allument à la suite (≤ 600 ms au total).
 */
export function createLoadStages(keys: string[], opts: LoadStagesOptions, onChange: (s: LoadStagesState) => void) {
  const dwell = opts.dwell ?? THRESH.stageMinDwell;
  const maxCatchUp = opts.maxCatchUp ?? 600;
  const showAfter = opts.showAfter ?? THRESH.skeletonDelay;
  const slowAfter = opts.slowAfter ?? THRESH.slowMessage;
  const retryAfter = opts.retryAfter ?? THRESH.retry;
  const total = keys.length;
  const minTotal = opts.minTotal ?? 0;
  let startedAt = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  let real = new Set<string>();
  let shown = 0;
  let visible = false;
  let started = false;
  let done = false;
  let slow = false;
  let canRetry = false;
  let failed: string | null = null;
  let lastAdvance = 0;
  let deadline = 0;
  let tick: ReturnType<typeof setTimeout> | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const realIndex = () => {
    let i = 0;
    while (i < total && real.has(keys[i])) i++;
    return i;
  };
  const state = (): LoadStagesState => ({ index: shown, total, done, visible, slow, canRetry, failed });
  const emit = () => onChange(state());
  const finish = () => {
    if (done) return;
    const rest = minTotal - (Date.now() - startedAt);
    if (rest > 0) {
      if (!holdTimer) holdTimer = setTimeout(() => {
        holdTimer = null;
        finish();
      }, rest);
      return;
    }
    done = true;
    timers.forEach(clearTimeout);
    timers.length = 0;
    emit();
    opts.onDone?.();
  };
  const settle = () => {
    if (tick) clearTimeout(tick);
    tick = null;
    if (done) return;
    const target = realIndex();
    if (!visible) {
      // Avant le seuil d'affichage : si tout est fini, on n'affiche rien.
      if (target === total) {
        shown = total;
        finish();
      }
      return;
    }
    if (shown >= target) {
      deadline = 0;
      if (shown === total) finish();
      return;
    }
    const backlog = target - shown;
    if (!deadline) deadline = Date.now() + maxCatchUp;
    const step = Math.min(dwell, Math.max(0, deadline - Date.now()) / backlog);
    const wait = Math.max(0, lastAdvance + step - Date.now());
    tick = setTimeout(() => {
      tick = null;
      shown += 1;
      lastAdvance = Date.now();
      emit();
      settle();
    }, wait);
  };
  const arm = () => {
    timers.forEach(clearTimeout);
    timers.length = 0;
    slow = false;
    canRetry = false;
    timers.push(
      setTimeout(() => {
        if (done) return;
        slow = true;
        emit();
      }, slowAfter),
      setTimeout(() => {
        if (done) return;
        canRetry = true;
        emit();
      }, retryAfter),
    );
  };

  return {
    start() {
      if (started) return;
      started = true;
      startedAt = Date.now();
      arm();
      if (showAfter <= 0) {
        visible = true;
        lastAdvance = Date.now() - dwell;
      }
      timers.push(
        setTimeout(() => {
          if (done || visible) return;
          visible = true;
          lastAdvance = Date.now() - dwell;
          emit();
          settle();
        }, showAfter),
      );
      emit();
    },
    markDone(key: string) {
      if (!keys.includes(key) || real.has(key)) return;
      real = new Set(real).add(key);
      if (failed === key) failed = null;
      settle();
      emit();
    },
    markFailed(key: string) {
      failed = key;
      canRetry = true;
      emit();
    },
    retry() {
      failed = null;
      arm();
      emit();
      opts.onRetry?.();
    },
    getState: state,
    dispose() {
      if (tick) clearTimeout(tick);
      if (holdTimer) clearTimeout(holdTimer);
      timers.forEach(clearTimeout);
    },
  };
}

export function useLoadStages(stages: Stage[], opts: LoadStagesOptions = {}) {
  const keys = useMemo(() => stages.map((s) => s.key), [stages]);
  const keyId = keys.join('|');
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const engine = useRef<ReturnType<typeof createLoadStages> | null>(null);
  const seen = useRef(new Set<string>());
  const [st, setSt] = useState<LoadStagesState>({
    index: 0, total: keys.length, done: false, visible: false, slow: false, canRetry: false, failed: null,
  });
  useEffect(() => {
    const o = optsRef.current;
    const e = createLoadStages(
      keys,
      { ...o, onDone: () => optsRef.current.onDone?.(), onRetry: () => optsRef.current.onRetry?.() },
      setSt,
    );
    engine.current = e;
    e.start();
    // Les événements arrivés avant la création du moteur sont rejoués.
    seen.current.forEach((k) => e.markDone(k));
    return () => {
      e.dispose();
      engine.current = null;
    };
    // keyId : on ne recrée le moteur que si la liste des clés change.
  }, [keyId]);
  const markDone = useCallback((key: string) => {
    seen.current.add(key);
    engine.current?.markDone(key);
  }, []);
  const markFailed = useCallback((key: string) => engine.current?.markFailed(key), []);
  const retry = useCallback(() => engine.current?.retry(), []);
  return { ...st, label: stages[Math.min(st.index, stages.length - 1)]?.label ?? '', markDone, markFailed, retry };
}
