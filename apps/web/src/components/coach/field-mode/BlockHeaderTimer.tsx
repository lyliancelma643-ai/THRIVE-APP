'use client';

// BLOC 1 — Titre du temps, durée cible et chronomètre de section.
//
// Le chrono démarre à l'ouverture de la page. Le dépassement de la durée cible
// est signalé par un changement de teinte doux et un libellé explicite : ni
// alarme, ni son, ni rouge — on ne stresse ni le coach ni le jeune.
import { useEffect, useState } from 'react';
import type { SectionTimer } from '@/hooks/useSessionDraft';
import { tap } from './haptics';

function format(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function elapsedOf(timer: SectionTimer | undefined, now: number): number {
  if (!timer) return 0;
  return timer.accumulatedMs + (timer.runningSince ? now - timer.runningSince : 0);
}

export function BlockHeaderTimer({
  title,
  durationMin,
  timer,
  onChange,
}: {
  title: string;
  durationMin: number | null;
  timer: SectionTimer | undefined;
  onChange: (next: SectionTimer) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const running = !!timer?.runningSince;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = elapsedOf(timer, now);
  const targetMs = durationMin != null ? durationMin * 60_000 : null;
  const over = targetMs != null && elapsed > targetMs;

  const pauseOrResume = () => {
    tap();
    const t = timer ?? { accumulatedMs: 0, runningSince: null };
    onChange(
      t.runningSince
        ? { accumulatedMs: t.accumulatedMs + (Date.now() - t.runningSince), runningSince: null }
        : { accumulatedMs: t.accumulatedMs, runningSince: Date.now() }
    );
  };

  const reset = () => {
    tap();
    onChange({ accumulatedMs: 0, runningSince: Date.now() });
  };

  return (
    <header>
      <h1
        className="font-display font-bold leading-tight text-[28px] sm:text-[34px]"
        style={{ color: 'var(--fm-text)' }}
      >
        {title}
      </h1>

      <div className="mt-3 flex items-center gap-2">
        {durationMin != null && (
          <span
            className="px-3 py-2 rounded-full text-[17px] font-bold tabular-nums"
            style={{ background: 'var(--fm-surface-2)', color: 'var(--fm-text)' }}
          >
            {durationMin} min
          </span>
        )}

        <span
          className="px-3 py-2 rounded-full text-[17px] font-bold tabular-nums inline-flex items-center gap-1.5"
          style={{
            background: over ? 'var(--fm-over)' : 'var(--fm-surface-2)',
            color: over ? 'var(--fm-bg)' : 'var(--fm-text)',
          }}
        >
          {/* Jamais la couleur seule : le dépassement est aussi écrit. */}
          <span aria-hidden>{over ? '⏱' : running ? '▶' : '⏸'}</span>
          <span>{format(elapsed)}</span>
          {over && <span className="text-[15px] font-bold">· dépassé</span>}
        </span>

        <button
          type="button"
          onClick={pauseOrResume}
          aria-label={running ? 'Mettre le chronomètre en pause' : 'Reprendre le chronomètre'}
          className="min-w-[56px] min-h-[56px] rounded-2xl text-[17px] font-bold transition-colors duration-150"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)', border: '1px solid var(--fm-border)' }}
        >
          {running ? 'Pause' : 'Go'}
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Remettre le chronomètre à zéro"
          className="min-w-[56px] min-h-[56px] rounded-2xl text-[17px] font-bold transition-colors duration-150"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-dim)', border: '1px solid var(--fm-border)' }}
        >
          ↺
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {over ? `Durée cible de ${durationMin} minutes dépassée.` : ''}
      </p>
    </header>
  );
}
