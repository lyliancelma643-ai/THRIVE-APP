'use client';

// Coquille du Mode Terrain — plein écran, une page par temps de séance.
//
// Contexte d'usage : coach debout, une main, potentiellement ganté, lumière
// variable, le regard sur le jeune. D'où : cibles ≥ 56 px, actions primaires
// dans le tiers inférieur, retour et sortie toujours au même endroit, aucune
// action destructive à un tap.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FieldModeSession } from '@/lib/field-mode/types';
import type { SectionTimer } from '@/hooks/useSessionDraft';
import { FieldModePage } from './FieldModePage';
import { useFieldTheme } from './theme';
import { tap } from './haptics';

/** Distance minimale d'un swipe horizontal, pour ne pas gêner le scroll. */
const SWIPE_PX = 60;

export function FieldModeShell({
  session,
  subtitle,
  pageIndex,
  onPageIndex,
  checks,
  ratings,
  fields,
  timers,
  onToggleCheck,
  onRate,
  onField,
  onTimers,
  onExit,
}: {
  session: FieldModeSession;
  subtitle: string;
  pageIndex: number;
  onPageIndex: (i: number) => void;
  checks: Record<string, boolean>;
  ratings: Record<string, number>;
  fields: Record<string, string>;
  timers: Record<string, SectionTimer>;
  onToggleCheck: (key: string) => void;
  onRate: (key: string, value: number) => void;
  onField: (key: string, value: string) => void;
  onTimers: (updater: (prev: Record<string, SectionTimer>) => Record<string, SectionTimer>) => void;
  /** Sortie explicite : ramène au mode standard, au même endroit de la séance. */
  onExit: (blockIndex: number) => void;
}) {
  const { resolved, vars, toggle } = useFieldTheme();
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(true);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = session.pages.length;
  const index = Math.min(Math.max(pageIndex, 0), total - 1);
  const page = session.pages[index];

  useEffect(() => setMounted(true), []);

  // Les variables de thème sont posées sur la racine : les surcouches
  // (détail, éditeur de note) sont portées sur <body> et doivent en hériter.
  useEffect(() => {
    const root = document.documentElement;
    const entries = Object.entries(vars as Record<string, string>);
    for (const [k, v] of entries) root.style.setProperty(k, v);
    return () => {
      for (const [k] of entries) root.style.removeProperty(k);
    };
  }, [vars]);

  // Plein écran + orientation portrait : au mieux de ce que la plateforme
  // permet (indisponible sur iPhone — on n'en fait jamais un prérequis).
  useEffect(() => {
    const el = document.documentElement;
    el.requestFullscreen?.().catch(() => {});
    const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
    orientation?.lock?.('portrait').catch(() => {});
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      orientation?.unlock?.();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Indicateur de synchronisation — discret, jamais bloquant : tout est déjà
  // écrit sur l'appareil, le bilan part à la fin de séance.
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Chronomètre de section : démarre à l'ouverture de la page, se met en pause
  // dès qu'on la quitte — le temps accumulé n'est jamais perdu.
  useEffect(() => {
    const id = page.id;
    const now = Date.now();
    onTimers((prev) => {
      const next: Record<string, SectionTimer> = {};
      for (const [key, t] of Object.entries(prev)) {
        next[key] = key !== id && t.runningSince
          ? { accumulatedMs: t.accumulatedMs + (now - t.runningSince), runningSince: null }
          : t;
      }
      const current = next[id] ?? { accumulatedMs: 0, runningSince: null };
      next[id] = current.runningSince ? current : { ...current, runningSince: now };
      return next;
    });
  }, [page.id, onTimers]);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return;
      tap();
      onPageIndex(next);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    },
    [total, onPageIndex]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  if (!mounted) return null;

  const progress = ((index + 1) / total) * 100;

  // Portail sur <body> : le conteneur de page porte une transformation
  // persistante, qui casserait tout `position: fixed` imbriqué.
  return createPortal(
    <div
      style={{ ...vars, background: 'var(--fm-bg)', colorScheme: resolved === 'dark' ? 'dark' : 'light' }}
      className="fixed inset-0 z-[110] flex flex-col"
    >
      {/* Progression discrète */}
      <div className="shrink-0 h-1.5 w-full" style={{ background: 'var(--fm-surface-2)' }}>
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${progress}%`, background: 'var(--fm-accent)' }}
        />
      </div>

      {/* Barre haute — retour et sortie toujours au même endroit, jamais masqués */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 safe-top">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="Étape précédente"
          className="min-w-[56px] min-h-[56px] rounded-2xl text-[22px] font-bold disabled:opacity-35"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
        >
          ←
        </button>

        <div className="flex-1 text-center">
          <p className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--fm-text)' }}>
            {index + 1} / {total}
          </p>
          <p className="text-[15px] truncate" style={{ color: 'var(--fm-dim)' }}>
            {online ? subtitle : 'Hors ligne — tout est gardé sur l’appareil'}
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Passer en mode haute luminosité' : 'Passer en mode sombre'}
          className="min-w-[56px] min-h-[56px] rounded-2xl text-[19px]"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
        >
          {resolved === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      {/* Contenu — swipe horizontal pour changer de temps */}
      <div
        ref={scrollRef}
        tabIndex={-1}
        className="flex-1 min-h-0 overflow-y-auto overscroll-x-contain px-4 pt-2 pb-6"
        onTouchStart={(e) => {
          touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchRef.current;
          touchRef.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        <p className="sr-only" aria-live="polite">
          Temps {index + 1} sur {total} — {page.title}
        </p>
        <FieldModePage
          key={page.id}
          page={page}
          checks={checks}
          ratings={ratings}
          fields={fields}
          timer={timers[page.id]}
          onToggleCheck={onToggleCheck}
          onRate={onRate}
          onField={onField}
          onTimer={(next) => onTimers((prev) => ({ ...prev, [page.id]: next }))}
        />
      </div>

      {/* Zone du pouce — actions primaires dans le tiers inférieur */}
      <div
        className="shrink-0 px-3 pt-2 pb-3 safe-bottom flex items-center gap-2"
        style={{ borderTop: '1px solid var(--fm-border)', background: 'var(--fm-bg)' }}
      >
        <button
          type="button"
          onClick={() => {
            tap();
            onExit(page.blockIndex);
          }}
          className="min-h-[56px] px-4 rounded-2xl text-[17px] font-bold"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
        >
          Quitter
        </button>
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="min-h-[56px] flex-1 rounded-2xl text-[19px] font-bold disabled:opacity-35"
          style={{ background: 'var(--fm-surface)', color: 'var(--fm-text)' }}
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === total - 1}
          className="min-h-[56px] flex-[1.4] rounded-2xl text-[19px] font-bold disabled:opacity-35"
          style={{ background: 'var(--fm-accent)', color: 'var(--fm-on-accent)' }}
        >
          Suivant
        </button>
      </div>
    </div>,
    document.body
  );
}
