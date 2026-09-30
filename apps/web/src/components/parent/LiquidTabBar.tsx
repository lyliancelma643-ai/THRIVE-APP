'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Barre d'onglets « verre liquide » (Bilan · Mes séances · Maison), téléphone et iPad portrait.
//
//   • Toucher : l'onglet s'ouvre, le repère glisse avec un léger rebond.
//   • Maintenir (≈ 170 ms) : le repère se soulève sous le doigt — plus grand, plus clair,
//     comme une goutte de verre.
//   • Glisser : la goutte suit le doigt et s'étire selon la vitesse ; dès qu'elle passe
//     sur un autre onglet, la page change en conséquence (pages préchargées).
//   • Lâcher : la goutte se pose sur l'onglet le plus proche, avec un rebond.
//
// Le défilement vertical reste prioritaire ; « réduire les animations » coupe l'étirement
// et le rebond (le repère se déplace sans effet).
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui';

type Tab = { href: string; label: string; icon: IconName };

const HOLD_MS = 170;
const MOVE_SLOP = 6;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function LiquidTabBar({
  tabs,
  active,
  tabOpen,
  onNavigate,
  onTap,
}: {
  tabs: Tab[];
  active: number;
  tabOpen: (i: number) => boolean;
  /** Changement d'onglet décidé par le geste (le sens sert à l'animation de la page). */
  onNavigate: (i: number, direction: 1 | -1) => void;
  /** Toucher simple d'un onglet (le lien fait la navigation). */
  onTap: (i: number) => void;
}) {
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [held, setHeld] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const g = useRef({
    id: -1,
    startX: 0,
    startY: 0,
    offset: 0,
    lastX: 0,
    lastT: 0,
    x: 0,
    w: 0,
    hover: 0,
    live: false,
    suppressClick: false,
    timer: 0,
  });
  const n = tabs.length;
  const shown = target ?? (active < 0 ? 0 : active);

  // Les trois pages sont préchargées : la page suit la goutte sans attendre le réseau.
  useEffect(() => {
    tabs.forEach((t) => router.prefetch(t.href));
  }, [router, tabs]);

  // L'onglet visé est atteint : on rend la main à la position réelle.
  useEffect(() => {
    if (target !== null && target === active) setTarget(null);
  }, [active, target]);

  const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Pose la goutte à x (px) ; l'étirement suit la vitesse horizontale. */
  const place = useCallback((x: number, vx: number) => {
    const el = pillRef.current;
    if (!el) return;
    if (reduced()) {
      el.style.transform = `translateX(${x}px)`;
      return;
    }
    const s = Math.min(Math.abs(vx) * 0.32, 0.26);
    el.style.transform = `translateX(${x}px) scale(${1.1 + s}, ${1.1 - s * 0.55})`;
  }, []);

  const lift = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const st = g.current;
      if (!track || st.live) return;
      st.live = true;
      const r = track.getBoundingClientRect();
      st.x = clamp(clientX - r.left - st.offset, 0, r.width - st.w);
      setHeld(true);
      // Après le rendu : la goutte passe sous le doigt, soulevée.
      requestAnimationFrame(() => place(st.x, 0));
    },
    [place]
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const st = g.current;
    st.id = e.pointerId;
    st.startX = st.lastX = e.clientX;
    st.startY = e.clientY;
    st.lastT = e.timeStamp;
    st.w = r.width / n;
    st.hover = shown;
    st.live = false;
    st.suppressClick = false;
    // On attrape la goutte là où on l'a prise ; ailleurs, elle vient se centrer sous le doigt.
    const inPill = e.clientX - r.left - shown * st.w;
    st.offset = inPill >= 0 && inPill <= st.w ? inPill : st.w / 2;
    window.clearTimeout(st.timer);
    const x = e.clientX;
    st.timer = window.setTimeout(() => lift(x), HOLD_MS);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const st = g.current;
    if (e.pointerId !== st.id) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.live) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        // Geste vertical : on laisse faire.
        window.clearTimeout(st.timer);
        st.id = -1;
        return;
      }
      if (Math.abs(dx) < MOVE_SLOP) return;
      window.clearTimeout(st.timer);
      lift(e.clientX);
    }
    // Pendant le geste, tous les mouvements reviennent à la barre (le lien sous le doigt ne s'ouvre pas).
    if (!navRef.current?.hasPointerCapture(e.pointerId)) navRef.current?.setPointerCapture(e.pointerId);
    st.suppressClick = true;
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const x = clamp(e.clientX - r.left - st.offset, 0, r.width - st.w);
    const vx = (e.clientX - st.lastX) / Math.max(1, e.timeStamp - st.lastT);
    st.lastX = e.clientX;
    st.lastT = e.timeStamp;
    st.x = x;
    place(x, vx);
    // La goutte passe sur un autre onglet : la page change en conséquence.
    const idx = clamp(Math.round(x / st.w), 0, n - 1);
    if (idx !== st.hover && tabOpen(idx)) {
      const dir: 1 | -1 = idx > st.hover ? 1 : -1;
      st.hover = idx;
      setTarget(idx);
      onNavigate(idx, dir);
    }
  };

  const release = (e: ReactPointerEvent) => {
    const st = g.current;
    if (e.pointerId !== st.id) return;
    window.clearTimeout(st.timer);
    st.id = -1;
    if (navRef.current?.hasPointerCapture(e.pointerId)) navRef.current.releasePointerCapture(e.pointerId);
    if (!st.live) return;
    st.live = false;
    // La goutte se pose sur l'onglet le plus proche, avec un rebond.
    const idx = clamp(Math.round(st.x / st.w), 0, n - 1);
    const final = tabOpen(idx) ? idx : st.hover;
    const el = pillRef.current;
    if (el) el.style.transform = '';
    setHeld(false);
    setTarget(final);
    if (final !== st.hover) onNavigate(final, final > st.hover ? 1 : -1);
  };

  // Un glissé ne doit pas aussi « cliquer » l'onglet sous le doigt.
  const onClickCapture = (e: MouseEvent) => {
    if (g.current.suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      g.current.suppressClick = false;
    }
  };

  return (
    <nav
      ref={navRef}
      aria-label="Navigation principale"
      className="tabbar lg:hidden fixed bottom-0 inset-x-0 z-nav border-t border-line"
      style={{
        background: 'var(--tab)',
        boxShadow: 'var(--tab-shadow)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        touchAction: 'pan-y',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={trackRef} className="relative max-w-md mx-auto select-none [-webkit-touch-callout:none]">
        <span
          ref={pillRef}
          aria-hidden
          className={`nav-pill tab-pill absolute left-0 top-0 h-[52px] rounded-full ${held ? 'is-held' : ''}`}
          style={{
            width: `${100 / n}%`,
            // Pendant le geste, la position est pilotée directement (voir `place`).
            ...(held ? {} : { transform: `translateX(${shown * 100}%)` }),
            opacity: active < 0 && target === null ? 0 : 1,
          }}
        />
        <div className="grid grid-cols-3">
          {tabs.map((tab, i) => {
            const on = shown === i;
            return !tabOpen(i) && active !== i ? (
              // Compte en préparation : les autres sections restent visibles mais non cliquables.
              <span
                key={tab.href}
                aria-disabled
                title="Disponible après l'activation par ton coach"
                className="relative flex flex-col items-center justify-center gap-1 h-[52px] text-faint cursor-not-allowed"
              >
                <Icon name={tab.icon} className="w-[22px] h-[22px]" />
                <span className="text-xs font-semibold">{tab.label}</span>
              </span>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                draggable={false}
                onClick={() => onTap(i)}
                aria-current={active === i ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 h-[52px] transition-transform duration-200 ${
                  held && on ? 'scale-[1.08]' : ''
                }`}
                style={{ color: on ? 'var(--nav-active)' : 'var(--text3)', transition: 'color var(--dur-base) ease, transform 200ms ease' }}
              >
                <Icon name={tab.icon} fill={on ? 'currentColor' : 'none'} className="w-[22px] h-[22px]" />
                <span className="text-xs font-semibold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
