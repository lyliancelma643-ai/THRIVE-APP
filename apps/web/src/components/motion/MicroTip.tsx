'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { THRESH, pickMicrocopy, type MicroContext, type MicroData, type PickedMicro } from '@thrive/shared';
import { Rise } from './Rise';

const KEPT_KEY = 'thrive.microtips.kept';
const ANSWERS_KEY = 'thrive.microtips.answers';
// Jamais deux fois le même d'affilée, d'une attente à l'autre.
let lastShownId: string | null = null;

const EYEBROW = { definition: 'Un mot pour comprendre', parent: 'Pour toi, ce soir', reminder: 'Rien à faire', question: 'Une petite question' } as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* local seulement */
  }
}

export type MicroTipProps = { context: MicroContext; week?: number | null; childName?: string | null; data?: MicroData; family?: 'question'; rotate?: boolean };

/** Un seul petit mot par attente, choisi par contexte (jamais au hasard). Phase 1 : « Garder » et les réponses restent sur l'appareil. */
export function MicroTip({ context, week, childName, data, family, rotate = false }: MicroTipProps) {
  const [tip, setTip] = useState<PickedMicro | null>(null);
  const [kept, setKept] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const ref = useRef({ context, week, childName, data, family });
  ref.current = { context, week, childName, data, family };
  const dataKey = JSON.stringify(data ?? {});

  // Choisi après le montage (localStorage et hydratation) ; refait si le contexte arrive plus tard.
  useEffect(() => {
    setKept(read<string[]>(KEPT_KEY, []));
    if (!tip) setTip(pickMicrocopy({ ...ref.current, lastShownId }));
  }, [tip, childName, week, dataKey]);
  useEffect(() => {
    if (tip) lastShownId = tip.id;
  }, [tip]);
  useEffect(() => {
    if (!rotate) return;
    const id = window.setTimeout(() => setTip(pickMicrocopy({ ...ref.current, lastShownId })), THRESH.tipSwap);
    return () => window.clearTimeout(id);
  }, [rotate]);

  const isKept = useMemo(() => (tip ? kept.includes(tip.id) : false), [kept, tip]);
  if (!tip) return null;

  return (
    <Rise key={tip.id}>
      <section className="nc-card min-h-[132px] !rounded-[22px] !p-[18px]">
        <p className="nc-eyebrow">{EYEBROW[tip.family]}</p>
        <p className="mt-2 font-display text-[20px] leading-[26px] font-medium text-ink" aria-live="polite">
          {tip.resolved}
        </p>
        {tip.family === 'question' && tip.options ? (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {tip.options.map((o) => (
              <button
                key={o}
                aria-pressed={answer === o}
                onClick={() => {
                  setAnswer(o);
                  write(ANSWERS_KEY, { ...read<Record<string, unknown>>(ANSWERS_KEY, {}), [tip.id]: { value: o, at: new Date().toISOString() } });
                }}
                className={`min-h-11 rounded-full px-4 text-[15px] font-semibold text-ink ${answer === o ? 'bg-accent text-accent-on' : 'bg-chip'}`}
              >
                {o}
              </button>
            ))}
          </div>
        ) : tip.family !== 'reminder' ? (
          <button
            aria-pressed={isKept}
            onClick={() => {
              const next = isKept ? kept.filter((k) => k !== tip.id) : [...kept, tip.id];
              setKept(next);
              write(KEPT_KEY, next);
            }}
            className={`mt-2.5 min-h-11 text-[14px] font-semibold ${isKept ? 'text-soft' : 'text-accent-ink'}`}
          >
            {isKept ? 'Gardé dans ton carnet' : 'Garder ce mot'}
          </button>
        ) : null}
      </section>
    </Rise>
  );
}
