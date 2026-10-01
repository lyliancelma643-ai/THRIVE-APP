'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Les trois onglets (Bilan · Mes séances · Maison) restent montés une fois visités :
// changer d'onglet ne recharge plus rien, chaque écran garde ses données, son état
// et sa hauteur de défilement. Le passage de l'un à l'autre est un glissement
// horizontal dans le sens de l'onglet choisi (vers la droite si l'onglet est à
// droite, vers la gauche sinon).
//
// Au repos, aucun `transform` n'est posé : les éléments `position: fixed` des écrans
// (feuilles, fenêtres) restent calés sur l'écran. Seuls les deux écrans concernés
// sont affichés pendant le glissement ; les autres sont sortis de la mise en page mais
// gardés en vie (sans `display: none`, pour ne pas rejouer leurs animations d'entrée).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';

const GAP = 40;
const DURATION = 520;

// `lift` : décalage vertical de l'écran de départ, pour qu'il reste à sa place à l'écran
// pendant que la page se cale sur la hauteur de défilement de l'onglet d'arrivée.
/** Écran gardé en vie hors de la mise en page, sans être démonté ni caché par `display`. */
const HIDDEN = { position: 'absolute', top: 0, left: 0, width: '100%', height: 0, overflow: 'hidden', visibility: 'hidden' } as const;

type Slide = { from: number; to: number; phase: 'start' | 'run'; lift: number };

export function TabPager({ index, pages }: { index: number; pages: ComponentType[] }) {
  const [mounted, setMounted] = useState<Set<number>>(() => new Set(index >= 0 ? [index] : []));
  const [current, setCurrent] = useState(index);
  const [slide, setSlide] = useState<Slide | null>(null);
  const scrolls = useRef<number[]>(pages.map(() => 0));

  // Un onglet visité pour la première fois est monté dans le même rendu (pas d'image vide).
  if (index >= 0 && !mounted.has(index)) {
    const next = new Set(mounted);
    next.add(index);
    setMounted(next);
  }
  // Changement d'onglet : on garde l'écran de départ le temps du glissement.
  if (index !== current) {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setSlide(
      current >= 0 && index >= 0 && !reduce
        ? { from: current, to: index, phase: 'start', lift: (scrolls.current[index] ?? 0) - (scrolls.current[current] ?? 0) }
        : null
    );
    setCurrent(index);
  }

  // Hauteur de défilement de chaque onglet, notée tant qu'il est affiché au repos.
  useEffect(() => {
    if (index < 0 || slide) return;
    const onScroll = () => {
      scrolls.current[index] = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [index, slide]);

  // On retrouve l'onglet là où on l'avait laissé.
  useLayoutEffect(() => {
    if (current >= 0) window.scrollTo({ top: scrolls.current[current] ?? 0, behavior: 'instant' });
  }, [current]);

  // Deux images pour poser la position de départ, puis le glissement ; ensuite, repos.
  useEffect(() => {
    if (!slide) return;
    if (slide.phase === 'start') {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setSlide((s) => (s ? { ...s, phase: 'run' } : s)));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    const t = window.setTimeout(() => setSlide(null), DURATION + 40);
    return () => window.clearTimeout(t);
  }, [slide]);

  let transform: string | undefined;
  let transition: string | undefined;
  if (slide) {
    const forward = slide.to > slide.from;
    const start = forward ? 0 : -1;
    const end = forward ? -1 : 0;
    const pos = slide.phase === 'start' ? start : end;
    transform = `translateX(calc(${pos} * (100% + ${GAP}px)))`;
    transition = slide.phase === 'run' ? `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none';
  }
  const visible = (i: number) => i === index || (!!slide && (i === slide.from || i === slide.to));

  return (
    // Masqué (fiche, carnet…) sans `display: none` : les animations d'entrée des
    // écrans ne se rejouent pas quand on revient, rien ne donne l'impression d'un rechargement.
    <div style={index < 0 ? HIDDEN : { position: 'relative' }} aria-hidden={index < 0 || undefined} inert={index < 0 || undefined}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: GAP, transform, transition, willChange: slide ? 'transform' : undefined }}>
        {pages.map((Page, i) =>
          mounted.has(i) ? (
            <section
              key={i}
              aria-hidden={i !== index || undefined}
              inert={i !== index || undefined}
              style={
                visible(i)
                  ? {
                      flex: '0 0 100%',
                      minWidth: 0,
                      transform: slide && i === slide.from && slide.lift ? `translateY(${slide.lift}px)` : undefined,
                    }
                  : HIDDEN
              }
            >
              <Page />
            </section>
          ) : null
        )}
      </div>
    </div>
  );
}
