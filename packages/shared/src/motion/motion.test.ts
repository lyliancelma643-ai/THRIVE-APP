import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDelayedFlag } from './delayedFlag';
import { createLoadStages, type LoadStagesState } from './loadStages';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createDelayedFlag', () => {
  it('ne s’affiche pas si l’attente est courte', () => {
    const seen: boolean[] = [];
    const f = createDelayedFlag({}, (v) => seen.push(v));
    f.set(true);
    vi.advanceTimersByTime(250);
    f.set(false);
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual([]);
  });
  it('s’affiche après 400 ms et reste au moins 300 ms', () => {
    const seen: boolean[] = [];
    const f = createDelayedFlag({}, (v) => seen.push(v));
    f.set(true);
    vi.advanceTimersByTime(401);
    expect(seen).toEqual([true]);
    vi.advanceTimersByTime(100);
    f.set(false);
    vi.advanceTimersByTime(150);
    expect(seen).toEqual([true]);
    vi.advanceTimersByTime(60);
    expect(seen).toEqual([true, false]);
  });
});

function engine(keys = ['a', 'b', 'c', 'd']) {
  const states: LoadStagesState[] = [];
  const onDone = vi.fn();
  const onRetry = vi.fn();
  const e = createLoadStages(keys, { onDone, onRetry }, (s) => states.push(s));
  e.start();
  return { e, states, onDone, onRetry };
}

describe('createLoadStages', () => {
  it('tout fini avant 400 ms : jamais visible, fin immédiate', () => {
    const { e, onDone } = engine();
    ['a', 'b', 'c', 'd'].forEach((k) => e.markDone(k));
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(e.getState().visible).toBe(false);
    expect(e.getState().done).toBe(true);
  });
  it('événements dans le désordre : index = marches contiguës', () => {
    const { e } = engine();
    vi.advanceTimersByTime(500);
    e.markDone('c');
    e.markDone('d');
    vi.advanceTimersByTime(2000);
    expect(e.getState().index).toBe(0);
    e.markDone('a');
    vi.advanceTimersByTime(1000);
    expect(e.getState().index).toBe(1);
    e.markDone('b');
    vi.advanceTimersByTime(1000);
    expect(e.getState().index).toBe(4);
    expect(e.getState().done).toBe(true);
  });
  it('rafale : rattrape en moins de 600 ms', () => {
    const { e, onDone } = engine();
    vi.advanceTimersByTime(500);
    ['a', 'b', 'c', 'd'].forEach((k) => e.markDone(k));
    vi.advanceTimersByTime(610);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(e.getState().index).toBe(4);
  });
  it('lenteur : slow à 8 s, retry possible à 20 s', () => {
    const { e, onRetry } = engine();
    vi.advanceTimersByTime(7900);
    expect(e.getState().slow).toBe(false);
    vi.advanceTimersByTime(200);
    expect(e.getState().slow).toBe(true);
    expect(e.getState().canRetry).toBe(false);
    vi.advanceTimersByTime(12000);
    expect(e.getState().canRetry).toBe(true);
    e.retry();
    expect(onRetry).toHaveBeenCalled();
    expect(e.getState().slow).toBe(false);
  });
  it('échec : failed puis reprise', () => {
    const { e } = engine();
    vi.advanceTimersByTime(500);
    e.markFailed('b');
    expect(e.getState().failed).toBe('b');
    expect(e.getState().canRetry).toBe(true);
    e.retry();
    expect(e.getState().failed).toBeNull();
  });
});
