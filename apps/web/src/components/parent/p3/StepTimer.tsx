"use client";

// Minuteur de jeu du mode activité — distinct du minuteur du moment (TimerRing).
//
// Le parent le lance à la main, UNE fois : l'écran enchaîne seul les phases et
// les tours (ex. 5 × « Tout cru, tout raide » 5 s · « Tout cuit, tout mou » 5 s).
// Plein écran pendant qu'il tourne : la couleur change à chaque phase et le mot
// s'affiche en très grand, pour que l'enfant puisse suivre l'écran lui aussi.
// Un « Prêt ? 3, 2, 1 » précède le départ. Petit bip (coupable) aux changements :
// l'enfant a parfois les yeux fermés. Relançable autant de fois que nécessaire.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import type { StepTimer as TStepTimer, TimerTone } from "@/lib/p3-moments";

export const TONE_BG: Record<TimerTone, string> = {
  action: "#C2410C",
  tension: "#B91C1C",
  detente: "#1D4ED8",
  inspire: "#0E7490",
  garde: "#6D28D9",
  expire: "#15803D",
  silence: "#1E293B",
};

const SOUND_KEY = "p3-timer-sound";
const LEAD_IN = 3;

const secondsLabel = (s: number) =>
  s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`;

export function timerSummary(t: TStepTimer): string {
  const one = t.phases.map((p) => secondsLabel(p.seconds)).join(" + ");
  return t.rounds > 1
    ? `${t.rounds} × ${t.phases.length > 1 ? `(${one})` : one}`
    : one;
}

function readSound(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function useBeep(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    try {
      const W = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const C = W.AudioContext ?? W.webkitAudioContext;
      if (!ctxRef.current && C) ctxRef.current = new C();
      void ctxRef.current?.resume();
    } catch {
      ctxRef.current = null;
    }
  }, []);
  const beep = useCallback(
    (freq = 660, ms = 140) => {
      const ctx = ctxRef.current;
      if (!enabled || !ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + ms / 1000,
        );
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + ms / 1000 + 0.05);
      } catch {
        // Audio indisponible : l'écran suffit.
      }
    },
    [enabled],
  );
  useEffect(
    () => () => void ctxRef.current?.close().catch(() => undefined),
    [],
  );
  return { unlock, beep };
}

type Run = { startedAt: number; done: boolean };

export function StepTimer({ timer }: { timer: TStepTimer }) {
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const { unlock, beep } = useBeep(sound);
  const lastPhase = useRef<number>(-2);

  useEffect(() => setSound(readSound()), []);

  const cycle = timer.phases.reduce((n, p) => n + p.seconds, 0);
  const total = cycle * timer.rounds;

  useEffect(() => {
    if (!run || run.done) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [run]);

  const t = run ? (now - run.startedAt) / 1000 : 0;
  const lead = t < LEAD_IN;
  const tt = Math.max(0, t - LEAD_IN);
  const finished = !!run && (run.done || tt >= total);

  // Position courante : tour, phase, secondes restantes dans la phase.
  let round = 0;
  let phaseIdx = 0;
  let left = 0;
  if (run && !lead && !finished) {
    round = Math.floor(tt / cycle);
    let inCycle = tt - round * cycle;
    phaseIdx = 0;
    while (
      phaseIdx < timer.phases.length - 1 &&
      inCycle >= timer.phases[phaseIdx].seconds
    ) {
      inCycle -= timer.phases[phaseIdx].seconds;
      phaseIdx += 1;
    }
    left = Math.ceil(timer.phases[phaseIdx].seconds - inCycle);
  }
  const globalPhase = lead
    ? -1
    : finished
      ? 999
      : round * timer.phases.length + phaseIdx;

  // Bip à chaque changement de phase, double bip à la fin.
  useEffect(() => {
    if (!run) return;
    if (globalPhase === lastPhase.current) return;
    lastPhase.current = globalPhase;
    if (globalPhase === 999) {
      beep(880, 160);
      window.setTimeout(() => beep(880, 220), 240);
    } else if (globalPhase >= 0) beep(globalPhase % 2 ? 520 : 660);
  }, [globalPhase, run, beep]);

  useEffect(() => {
    if (!run || !finished || run.done) return;
    setRun((r) => (r ? { ...r, done: true } : r));
  }, [finished, run]);

  // Fermeture automatique peu après la fin : on revient au déroulé.
  useEffect(() => {
    if (!run?.done) return;
    const id = window.setTimeout(() => setRun(null), 2600);
    return () => window.clearTimeout(id);
  }, [run?.done]);

  const start = () => {
    unlock();
    lastPhase.current = -2;
    const s = Date.now();
    setNow(s);
    setRun({ startedAt: s, done: false });
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (next) unlock();
    try {
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // Réglage non mémorisé : sans conséquence.
    }
  };

  const phase = timer.phases[phaseIdx];
  const bg = !run
    ? undefined
    : lead
      ? "#0F172A"
      : finished
        ? "#14532D"
        : TONE_BG[phase.tone];

  return (
    <>
      <div className="nc-row p-4 mt-4">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-full bg-accent text-accent-on grid place-items-center shrink-0"
            aria-hidden
          >
            <Icon name="play" className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">
              Minuteur · {timerSummary(timer)}
            </p>
            <p className="text-[13px] text-soft">
              {timer.rounds > 1
                ? "Lancez une fois : l’écran enchaîne les tours tout seul."
                : "À lancer quand vous êtes prêts."}
            </p>
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Les phases">
          {timer.phases.map((p, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 text-[13px] text-body"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/40"
                style={{ background: TONE_BG[p.tone] }}
                aria-hidden
              />
              {p.label} · {secondsLabel(p.seconds)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={start}
          className="mt-4 w-full h-[52px] rounded-full bg-accent text-accent-on font-bold text-[16px] active:scale-[0.98] transition-transform motion-reduce:transition-none"
        >
          Lancer le minuteur
        </button>
      </div>

      {run &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex flex-col text-white transition-colors duration-300 motion-reduce:transition-none"
            style={{ background: bg }}
            role="timer"
            aria-live="assertive"
          >
            <div className="flex items-center justify-between px-5 safe-top h-16">
              <button
                type="button"
                onClick={toggleSound}
                className="min-h-[44px] px-4 rounded-full bg-white/15 text-[14px] font-semibold"
                aria-pressed={sound}
              >
                {sound ? "Son : oui" : "Son : non"}
              </button>
              {!lead && !finished && timer.rounds > 1 && (
                <span className="text-[16px] font-semibold tabular-nums">
                  Tour {round + 1} / {timer.rounds}
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              {lead ? (
                <>
                  <p className="text-[28px] font-semibold opacity-90">Prêt ?</p>
                  <p className="mt-2 font-display text-[120px] leading-none font-semibold tabular-nums">
                    {Math.ceil(LEAD_IN - t)}
                  </p>
                  <p className="mt-6 text-[20px] opacity-90">
                    D’abord : {timer.phases[0].label}
                  </p>
                </>
              ) : finished ? (
                <p className="font-display text-[56px] leading-[1.1] font-semibold">
                  Terminé !
                </p>
              ) : (
                <>
                  <p
                    key={globalPhase}
                    className="font-display text-[38px] md:text-[60px] leading-[1.1] font-semibold uppercase text-balance motion-safe:animate-om-fade"
                  >
                    {phase.label}
                  </p>
                  <p className="mt-6 font-display text-[110px] leading-none font-semibold tabular-nums">
                    {left}
                  </p>
                </>
              )}
            </div>

            <div className="px-5 pb-8 safe-bottom flex gap-3 justify-center">
              {finished ? (
                <>
                  <button
                    type="button"
                    onClick={start}
                    className="h-[56px] px-8 rounded-full bg-white text-[#0F172A] font-bold text-[17px]"
                  >
                    Relancer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRun(null)}
                    className="h-[56px] px-8 rounded-full bg-white/15 font-bold text-[17px]"
                  >
                    Fermer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setRun(null)}
                  className="h-[56px] px-10 rounded-full bg-white/15 font-bold text-[17px]"
                >
                  Arrêter
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
