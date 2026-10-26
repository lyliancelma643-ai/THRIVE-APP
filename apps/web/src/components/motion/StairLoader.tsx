'use client';

import type { ReactNode } from 'react';
import { MascotFace } from './Mascot';

const HEIGHTS = [30, 56, 82, 108];
const CX = [36, 98, 160, 222];
const CY = [106, 80, 54, 28];

export type StairLoaderProps = {
  title: string;
  doneTitle: string;
  doneSubtitle?: string;
  stages: { key: string; label: string }[];
  index: number;
  total: number;
  done: boolean;
  slow?: boolean;
  canRetry?: boolean;
  onRetry?: () => void;
  /** Bouton quand tout est prêt ; absent = on enchaîne tout seul. */
  cta?: { label: string; onClick: () => void } | null;
  /** Petit mot ancré en bas (disparaît quand tout est prêt). */
  tip?: ReactNode;
};

/** L'escalier : 4 marches qui s'allument sur des événements réels, la mascotte monte et plante le fanion. */
export function StairLoader({ title, doneTitle, doneSubtitle, stages, index, total, done, slow, canRetry, onRetry, cta, tip }: StairLoaderProps) {
  const at = Math.min(index, HEIGHTS.length - 1);
  const label = done ? doneSubtitle ?? '' : stages[Math.min(index, stages.length - 1)]?.label ?? '';
  const counter = done ? 'Terminé' : `Étape ${Math.min(index + 1, total)} sur ${total}`;
  return (
    <div className="mo-anim flex flex-col items-center px-6 pt-6 text-center">
      <svg width="300" height="182" viewBox="0 0 280 170" aria-hidden>
        <rect x="0" y="150" width="280" height="2" className="fill-line" />
        {HEIGHTS.map((h, i) => {
          const filled = i <= index || done;
          const active = i === index && !done;
          return (
            <g key={i}>
              <rect x={8 + 62 * i} y={150 - h} width="56" height={h} rx="8" className="fill-track" />
              <rect
                x={8 + 62 * i}
                y={150 - h}
                width="56"
                height={h}
                rx="8"
                className="fill-accent-ink"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: '50% 100%',
                  transform: filled ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: filled && !active ? 1 : active ? undefined : 0,
                  transition: 'transform var(--dur-stair-fill) var(--ease-out), opacity 300ms var(--ease-out)',
                  animation: active ? 'st-breathe 1600ms var(--ease-in-out) infinite' : undefined,
                }}
              />
            </g>
          );
        })}
        <rect x="244" y="2" width="3" height="40" className="fill-soft" />
        <path
          d="M247 2 L277 12 L247 22 Z"
          className="fill-accent"
          stroke="var(--on-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ transformBox: 'fill-box', transformOrigin: 'left center', transform: done ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 500ms var(--ease-spring)' }}
        />
        <g style={{ transform: `translate(${CX[at]}px, ${CY[at]}px)`, transition: 'transform 650ms cubic-bezier(.34,1.3,.5,1)' }}>
          <ellipse cx="0" cy="29" rx="10" ry="2.4" className="fill-track" />
          <g key={index} style={{ transformOrigin: '0px 14px', animation: done ? 'st-cheer 700ms var(--ease-spring) both' : index > 0 ? 'st-hop var(--dur-hop) var(--ease-out)' : undefined }}>
            <MascotFace r={14} />
          </g>
        </g>
      </svg>

      <h2 className="mt-7 text-[22px] leading-7 font-bold text-ink">{done ? doneTitle : title}</h2>
      <p key={label} className="mt-1.5 min-h-[22px] text-[17px] leading-[22px] text-body" aria-live="polite" style={{ animation: 'label-in var(--dur-base) var(--ease-out) backwards' }}>
        {label}
      </p>
      <div className="mt-[18px] flex flex-col items-center gap-2">
        <div className="h-1.5 w-[260px] overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done ? total : index} aria-label={title}>
          <div
            className="h-full w-full origin-left rounded-full bg-accent-ink"
            style={{ transform: `scaleX(${Math.max(0.04, (done ? total : index) / total)})`, transition: 'transform var(--dur-bar) var(--ease-out)' }}
          />
        </div>
        <p className="text-[13px] leading-[18px] text-faint tabular-nums">{counter}</p>
      </div>

      {slow && !done && <p className="animate-rise mt-4 text-[14px] leading-5 text-soft">Un peu plus long que d’habitude. Ton travail est sauvegardé.</p>}
      {canRetry && !done && onRetry && (
        <button onClick={onRetry} className="animate-rise mt-3 h-12 rounded-full bg-accent px-6 font-bold text-accent-on">
          Réessayer
        </button>
      )}
      {done && cta && (
        <button onClick={cta.onClick} className="animate-rise mt-6 h-[52px] rounded-full bg-accent px-8 font-bold text-accent-on">
          {cta.label}
        </button>
      )}
      {!done && tip && <div className="mt-6 w-full text-left">{tip}</div>}
    </div>
  );
}
