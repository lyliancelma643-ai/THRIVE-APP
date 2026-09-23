'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Toutes les activités — le catalogue, façon plateforme de streaming.
// Liberté totale : les 39 fiches, sans verrou de semaine. Les onglets d'âge
// (8–11 / 12–14 / 15–17) règlent la version montrée : chaque vignette affiche la
// phrase d'amorce de cette tranche (renderOpener, texte de fiche inchangé — R1),
// et la fiche s'ouvre dans cette version (?bande=).
// Trois taps au plus : Maison → Toutes → vignette → Lancer (sur la fiche).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { BackLink, PillGroup } from '@/components/parent/p3/pieces';
import { PosterCard } from '@/components/parent/p3/Poster';
import { recall, remember, usePageScrollMemory } from '@/components/parent/p3/scrollMemory';
import { useHScroll } from '@/components/parent/p3/useHScroll';
import { renderOpener, type AgeBand, type P3Activity } from '@/lib/p3-moments';
import { P3_BASE, p3Pool } from '@/lib/p3-moments/app';
import { BAND_LABELS, FILTERS, matchesFilter, type FilterId } from '@/lib/p3-moments/shelves';

const BANDS: AgeBand[] = ['8-11', '12-14', '15-17'];

const PHASES = [
  { id: 'ANCRER', label: 'Ancrer' },
  { id: 'DEVELOPPER', label: 'Développer' },
  { id: 'INTEGRER', label: 'Intégrer' },
] as const;

function weekSpan(items: P3Activity[]): string {
  const lo = Math.min(...items.map((a) => a.week));
  const hi = Math.max(...items.map((a) => a.week));
  return lo === hi ? `Semaine ${lo}` : `Semaines ${lo} à ${hi}`;
}

type Order = 'programme' | 'nouvelles';

function Catalogue({ ctx }: { ctx: P3Ctx }) {
  const { data, firstName } = ctx;
  // Âge, filtre et ordre restent choisis le temps de la session : on revient
  // d'une fiche (bouton ou geste) sur le même rayon, à la même hauteur.
  const mem = `toutes:${ctx.child.id}`;
  const [band, setBand] = useState<AgeBand>(() => recall(`${mem}:band`, ctx.band));
  const [filter, setFilter] = useState<FilterId>(() => recall(`${mem}:filter`, 'tout'));
  const [order, setOrder] = useState<Order>(() => recall(`${mem}:order`, 'programme'));
  const all = useMemo(() => p3Pool(), []);
  const filters = useHScroll(`${mem}:filters`);

  usePageScrollMemory(mem);
  useEffect(() => {
    remember(`${mem}:band`, band);
    remember(`${mem}:filter`, filter);
    remember(`${mem}:order`, order);
  }, [mem, band, filter, order]);

  const list = useMemo(() => {
    const kept = all.filter((a) => matchesFilter(a, filter, { doneIds: data.doneIds, favoris: data.saved.favoris }));
    const prog = (a: P3Activity, b: P3Activity) => a.week - b.week || a.rank - b.rank;
    return order === 'nouvelles'
      ? [...kept].sort((a, b) => Number(data.doneIds.has(a.id)) - Number(data.doneIds.has(b.id)) || prog(a, b))
      : [...kept].sort(prog);
  }, [all, filter, order, data.doneIds, data.saved.favoris]);

  const hrefOf = (a: P3Activity) => `${P3_BASE}/${a.id}${band === ctx.band ? '' : `?bande=${band}`}`;
  const card = (a: P3Activity) => (
    <PosterCard
      key={a.id}
      wide
      activity={a}
      href={hrefOf(a)}
      done={data.doneIds.has(a.id)}
      line={renderOpener(a, a.base_duration, band)}
    />
  );

  return (
    <div>
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[30px] md:text-[40px] font-semibold text-ink mt-2 leading-[1.1]">Toutes les activités</h1>
      <p className="text-[15px] text-soft mt-1.5 max-w-xl">
        {all.length} activités, toutes pensées pour les 8–17 ans. Choisissez l&apos;âge : la phrase à dire et la fiche s&apos;adaptent.
      </p>

      {/* Tri par âge */}
      <div className="mt-6">
        <p className="nc-eyebrow mb-2">Version pour</p>
        <div role="group" aria-label="Âge" className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={band === b}
              onClick={() => setBand(b)}
              className="nc-pill min-h-[44px] select-none"
            >
              {BAND_LABELS[b]}
              {b === ctx.band && <span className="ml-1.5 opacity-80">· {firstName}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div {...filters.props} className="mt-5 overflow-x-auto scrollbar-hide overscroll-x-contain -mx-5 px-5 md:mx-0 md:px-0">
        <div role="group" aria-label="Filtrer" className="flex gap-2 w-max md:w-auto md:flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className="nc-pill min-h-[44px] select-none shrink-0"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <PillGroup<Order>
          label="Ordre"
          value={order}
          options={[
            { value: 'programme', label: 'Ordre du programme' },
            { value: 'nouvelles', label: 'Nouvelles d’abord' },
          ]}
          onChange={setOrder}
        />
      </div>
      {list.length > 0 && (
        <p className="mt-4 text-[14px] text-soft">
          {list.length} activité{list.length > 1 ? 's' : ''} · version {BAND_LABELS[band]}
        </p>
      )}

      {list.length === 0 ? (
        <p className="text-[15px] text-soft py-10">Rien ici pour l&apos;instant. Ce rayon se remplira au fil des moments.</p>
      ) : order === 'programme' ? (
        PHASES.map((p) => {
          const items = list.filter((a) => a.phase === p.id);
          if (!items.length) return null;
          return (
            <section key={p.id} className="mt-9">
              <h2 className="font-display text-[22px] font-semibold text-ink">{p.label}</h2>
              <p className="text-[14px] text-soft mt-0.5">{weekSpan(items)}</p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3.5 gap-y-7">{items.map(card)}</div>
            </section>
          );
        })
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3.5 gap-y-7">{list.map(card)}</div>
      )}
    </div>
  );
}

export default function ToutesPage() {
  return <P3Frame>{(ctx) => <Catalogue ctx={ctx} />}</P3Frame>;
}
