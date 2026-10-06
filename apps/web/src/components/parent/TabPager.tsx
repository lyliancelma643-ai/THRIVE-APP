'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Les trois onglets (Maison · Bilan · Mes séances) sont montés dès le lancement, puis
// ne sont jamais démontés :
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

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';

/**
 * Vrai si l'écran est l'onglet affiché. Un écran monté en arrière-plan (préchargé)
 * ne doit pas toucher au défilement de la page : il lit ce contexte.
 */
const TabPaneContext = createContext(true);
export const useIsActivePane = () => useContext(TabPaneContext);

const GAP = 40;
const DURATION = 520;

// `lift` : décalage vertical de l'écran de départ, pour qu'il reste à sa place à l'écran
// pendant que la page se cale sur la hauteur de défilement de l'onglet d'arrivée.
/** Écran gardé en vie hors de la mise en page, sans être démonté ni caché par `display`. */
const HIDDEN = { position: 'absolute', top: 0, left: 0, width: '100%', height: 0, overflow: 'hidden', visibility: 'hidden' } as const;

type Slide = { from: number; to: number; phase: 'start' | 'run'; lift: number };

export function TabPager({ index, pages }: { index: number; pages: ComponentType[] }) {
  const [mounted, setMounted] = useState<Set<number>>(() => new Set(index >= 0 ? [index] : []));

  // Dès le lancement, les autres onglets se montent en arrière-plan, un par un, quand
  // le navigateur est au repos : leurs données sont prêtes avant même qu'on les ouvre.
  // Une fois montés, ils ne sont plus jamais démontés.
  useEffect(() => {
    if (mounted.size >= pages.length) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const next = () =>
      setMounted((m) => {
        const missing = pages.findIndex((_, i) => !m.has(i));
        if (missing < 0) return m;
        const n = new Set(m);
        n.add(missing);
        return n;
      });
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(next, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(next, 400);
    return () => window.clearTimeout(t);
  }, [mounted, pages]);
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
              <TabPaneContext.Provider value={i === index}>
                <Page />
              </TabPaneContext.Provider>
            </section>
          ) : null
        )}
      </div>
    </div>
  );
}
