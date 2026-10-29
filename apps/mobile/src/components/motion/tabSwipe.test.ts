// Pages blanches au glissé entre les onglets (TestFlight build 14) : scénarios reproductibles, logique pure.
//   • glissé rapide Bilan → Maison → Séances (la goutte retraverse Bilan) : UNE seule navigation, au lâcher ;
//   • réseau lent, réponses dans le désordre : seule la dernière lecture écrit l'état ;
//   • premier lancement : la page de chargement retient les étapes signalées avant son montage, 2 s minimum ;
//   • retour de l'arrière-plan : minuteurs rattrapés d'un coup, fin signalée une seule fois.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAB_DRAG_DWELL_MS, createTabDragNav } from '../../../../../packages/shared/src/motion/tabDrag';
import { createRequestGate } from '../../../../../packages/shared/src/motion/requestGate';
import { createLoadStages } from '../../../../../packages/shared/src/motion/loadStages';
import { usePageReadyStore } from '../../stores/pageReady.store';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const MAISON = 0;
const BILAN = 1;
const SEANCES = 2;

describe('glissé de la goutte (createTabDragNav)', () => {
  it('glissé rapide Bilan → Maison → Bilan → Séances : une seule navigation, vers Séances, au lâcher', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.begin(BILAN);
    nav.hover(MAISON);
    vi.advanceTimersByTime(60);
    nav.hover(BILAN);
    vi.advanceTimersByTime(40);
    nav.hover(SEANCES);
    vi.advanceTimersByTime(50);
    nav.release(SEANCES);
    vi.advanceTimersByTime(1000);
    expect(go.mock.calls).toEqual([[SEANCES]]);
  });

  it('la goutte s’attarde sur Maison : la page suit, sans doublon au lâcher', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.begin(BILAN);
    nav.hover(MAISON);
    vi.advanceTimersByTime(TAB_DRAG_DWELL_MS + 1);
    expect(go.mock.calls).toEqual([[MAISON]]);
    nav.release(MAISON);
    expect(go.mock.calls).toEqual([[MAISON]]);
  });

  it('aller-retour qui revient à l’onglet de départ : aucune navigation', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.begin(MAISON);
    nav.hover(BILAN);
    vi.advanceTimersByTime(100);
    nav.hover(MAISON);
    vi.advanceTimersByTime(1000);
    nav.release(MAISON);
    expect(go).not.toHaveBeenCalled();
  });

  it('va-et-vient frénétique pendant 2 s : jamais plus d’une navigation par survol prolongé', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.begin(MAISON);
    for (let i = 0; i < 40; i++) {
      nav.hover([BILAN, SEANCES, BILAN, MAISON][i % 4]);
      vi.advanceTimersByTime(50);
    }
    expect(go).not.toHaveBeenCalled();
    nav.release(SEANCES);
    expect(go.mock.calls).toEqual([[SEANCES]]);
  });

  it('démontage pendant le survol : aucun navigate tardif', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.begin(MAISON);
    nav.hover(SEANCES);
    nav.dispose();
    vi.advanceTimersByTime(1000);
    nav.release(SEANCES);
    expect(go).not.toHaveBeenCalled();
  });

  it('survol hors geste (pas de begin) ignoré ; sync suit l’onglet ouvert par un toucher', () => {
    const go = vi.fn();
    const nav = createTabDragNav({ onNavigate: go });
    nav.hover(BILAN);
    vi.advanceTimersByTime(1000);
    expect(go).not.toHaveBeenCalled();
    nav.sync(SEANCES);
    expect(nav.committed()).toBe(SEANCES);
  });
});

describe('réseau lent, réponses dans le désordre (createRequestGate)', () => {
  it('la lecture la plus récente gagne, l’ancienne est annulée et ignorée', async () => {
    const gate = createRequestGate();
    const state: string[] = [];
    const read = (label: string, ms: number) => {
      const t = gate.begin();
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          if (!t.stale) state.push(label);
          resolve();
        }, ms),
      ).then(() => t);
    };
    const slow = read('maison-ancienne', 900);
    const fast = read('maison-recente', 100);
    vi.advanceTimersByTime(1000);
    const [a, b] = await Promise.all([slow, fast]);
    expect(state).toEqual(['maison-recente']);
    expect(a.signal?.aborted).toBe(true);
    expect(b.signal?.aborted).toBe(false);
  });

  it('écran démonté (onglet quitté, enfant changé) : plus aucune écriture', () => {
    const gate = createRequestGate();
    const t = gate.begin();
    gate.dispose();
    expect(t.stale).toBe(true);
    expect(gate.begin().stale).toBe(true);
  });

  it('cancel() rend périmé sans bloquer la lecture suivante', () => {
    const gate = createRequestGate();
    const a = gate.begin();
    gate.cancel();
    const b = gate.begin();
    expect(a.stale).toBe(true);
    expect(b.stale).toBe(false);
  });
});

describe('page de chargement des onglets (pageReady + escalier)', () => {
  beforeEach(() => usePageReadyStore.getState().reset());

  it('premier lancement : étapes signalées avant le montage du voile, rejouées, fin après 2 s', () => {
    const st = usePageReadyStore.getState();
    // La page Bilan, montée cachée (lazy:false), finit avant que l'onglet soit ouvert.
    st.mark('bilan', 'dossier');
    st.mark('bilan', 'affichage');
    st.mark('bilan', 'dossier');
    expect(usePageReadyStore.getState().marks.bilan).toEqual(['dossier', 'affichage']);

    const onDone = vi.fn();
    const e = createLoadStages(['session', 'profil', 'dossier', 'affichage'], { showAfter: 0, minTotal: 2000, onDone }, () => undefined);
    e.start();
    usePageReadyStore.getState().marks.bilan.forEach((k) => e.markDone(k));
    e.markDone('session');
    e.markDone('profil');
    vi.advanceTimersByTime(1500);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(onDone).toHaveBeenCalledTimes(1);
    usePageReadyStore.getState().reveal('bilan');
    usePageReadyStore.getState().reveal('bilan');
    expect(usePageReadyStore.getState().revealed).toEqual({ maison: false, bilan: true, seances: false });
  });

  it('retour de l’arrière-plan : minuteurs rattrapés d’un coup, fin signalée une seule fois', () => {
    const onDone = vi.fn();
    const e = createLoadStages(['a', 'b'], { showAfter: 0, minTotal: 2000, onDone }, () => undefined);
    e.start();
    e.markDone('a');
    e.markDone('b');
    vi.advanceTimersByTime(60_000);
    e.markDone('b');
    vi.advanceTimersByTime(60_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('déconnexion : les onglets retrouvent leur page de chargement', () => {
    usePageReadyStore.getState().reveal('maison');
    usePageReadyStore.getState().mark('maison', 'semaine');
    usePageReadyStore.getState().reset();
    expect(usePageReadyStore.getState().revealed.maison).toBe(false);
    expect(usePageReadyStore.getState().marks.maison).toEqual([]);
  });
});
