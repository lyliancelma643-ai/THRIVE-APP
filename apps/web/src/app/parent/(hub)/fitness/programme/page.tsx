'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E2 — Le programme : les 13 semaines, où on en est, et la bibliothèque.
// Liberté totale : toutes les semaines s'ouvrent ; la semaine en cours est
// seulement signalée comme celle que le programme conseille. Jamais de rouge,
// jamais de « manqué ».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { BackLink, PillGroup, PillarTag } from '@/components/parent/p3/pieces';
import { cameBack, recall, remember, usePageScrollMemory } from '@/components/parent/p3/scrollMemory';
import { P3_WEEKS, activitiesOfWeek, type P3Activity } from '@/lib/p3-moments';
import { ROLE_LABELS } from '@/lib/p3-moments/guide';
import { P3_BASE, p3Pool } from '@/lib/p3-moments/app';

const PHASE_LABEL = { ANCRER: 'Ancrer', DEVELOPPER: 'Développer', INTEGRER: 'Intégrer' } as const;

type Shelf = 'tout' | 'voiture' | 'non' | 'epuise' | 'preferees' | 'de_cote' | 'favoris';
const SHELVES: { value: Shelf; label: string }[] = [
  { value: 'tout', label: "J'ai 10 minutes" },
  { value: 'voiture', label: 'Dans la voiture' },
  { value: 'non', label: 'Quand il dit non' },
  { value: 'epuise', label: 'Quand je suis épuisé' },
  { value: 'preferees', label: 'Ses préférées' },
  { value: 'de_cote', label: 'Mis de côté' },
  { value: 'favoris', label: 'Favoris' },
];

function FicheRow({ a, done }: { a: P3Activity; done: boolean }) {
  return (
    <Link href={`${P3_BASE}/${a.id}`} className="nc-row flex items-center gap-3 p-4 min-h-[64px]">
      <span
        aria-label={done ? 'Déjà vécue' : 'Pas encore'}
        className={`w-3 h-3 rounded-full shrink-0 ${done ? 'bg-accent' : 'border border-line2'}`}
      />
      <span className="flex-1 min-w-0">
        <span className="nc-eyebrow block">{ROLE_LABELS[a.role]}</span>
        <span className="block text-[16px] font-semibold text-ink">{a.title}</span>
        <span className="block text-[14px] text-soft mt-0.5">{a.objective}</span>
        <span className="block text-[13px] text-faint mt-1">{a.durations.join(' · ')} min</span>
      </span>
      <Icon name="chevron-right" className="w-5 h-5 text-soft shrink-0" />
    </Link>
  );
}

function Programme({ ctx }: { ctx: P3Ctx }) {
  const { data } = ctx;
  // La semaine ouverte reste ouverte au retour d'une fiche (bouton ou geste).
  const [openDetail, setOpenDetail] = useState<number | null>(() =>
    cameBack() ? recall(`programme:${ctx.child.id}:week`, null) : null
  );
  useEffect(() => remember(`programme:${ctx.child.id}:week`, openDetail), [ctx.child.id, openDetail]);
  const [whyOpen, setWhyOpen] = useState(false);
  const [shelf, setShelf] = useState<Shelf>('tout');
  const pool = useMemo(() => p3Pool(), []);

  usePageScrollMemory(`programme:${ctx.child.id}`);

  const lastRating = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const x of data.moments) if (!m.has(x.activity_id)) m.set(x.activity_id, x.rating);
    return m;
  }, [data.moments]);

  const library = useMemo(() => {
    const open = pool;
    switch (shelf) {
      case 'voiture':
        return open.filter((a) => a.car_ok);
      case 'non':
        return open.filter((a) => a.anti_refusal);
      case 'epuise':
        return open.filter((a) => a.parent_energy === 'basse');
      case 'preferees':
        return open.filter((a) => (lastRating.get(a.id) ?? 0) >= 4);
      case 'de_cote':
        return open.filter((a) => data.saved.deCote.has(a.id));
      case 'favoris':
        return open.filter((a) => data.saved.favoris.has(a.id));
      default:
        return open;
    }
  }, [pool, shelf, lastRating, data.saved]);

  const detail = openDetail ? P3_WEEKS.find((w) => w.week === openDetail) : null;

  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[30px] md:text-[36px] font-semibold text-ink mt-2">Le programme</h1>
      <p className="text-[15px] text-soft mt-1">13 semaines, trois moments par semaine, avec {ctx.firstName}.</p>

      {detail ? (
        <section className="mt-6 animate-om-up">
          <button type="button" onClick={() => setOpenDetail(null)} className="inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-semibold text-soft">
            <Icon name="chevron-right" className="w-4 h-4 rotate-180" /> Les 13 semaines
          </button>
          <p className="nc-eyebrow mt-3">
            Semaine {detail.week} · {PHASE_LABEL[detail.phase]}
          </p>
          <h2 className="font-display text-[28px] font-semibold text-ink mt-1">{detail.title}</h2>
          <p className="font-display text-[24px] leading-[1.3] text-ink mt-4">{detail.opening_line}</p>
          <div className="mt-4 space-y-3">
            {detail.intro.map((p, i) => (
              <p key={i} className="text-[16px] leading-[1.6] text-body">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {detail.pillars.map((p) => (
              <PillarTag key={p} pillar={p} />
            ))}
          </div>
          <button type="button" onClick={() => setWhyOpen((o) => !o)} aria-expanded={whyOpen} className="mt-4 min-h-[44px] text-[14px] font-semibold text-accent-ink">
            Pourquoi cette semaine
          </button>
          {whyOpen && (
            <div className="text-[14px] leading-[1.55] text-soft space-y-1">
              <p>{detail.session_source}</p>
              <p>
                {detail.action} · {detail.skill}
              </p>
              <p>{detail.foundation}</p>
            </div>
          )}
          <div className="mt-6 space-y-3">
            {activitiesOfWeek(detail.week)
              .filter((a) => pool.some((p) => p.id === a.id))
              .map((a) => (
                <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} />
              ))}
          </div>
        </section>
      ) : (
        <>
          <ol className="mt-6 space-y-2.5">
            {P3_WEEKS.map((w) => {
              const current = w.week === data.openWeek;
              const acts = activitiesOfWeek(w.week);
              return (
                <li key={w.week}>
                  <button
                    type="button"
                    onClick={() => setOpenDetail(w.week)}
                    className={`nc-row w-full text-left flex items-center gap-3 p-4 min-h-[64px] ${current ? 'ring-1 ring-accent-line' : ''}`}
                  >
                    <span className="font-display text-[20px] font-semibold text-accent-ink w-8 shrink-0">{w.week}</span>
                    <span className="flex-1 min-w-0">
                      <span className="nc-eyebrow block">
                        {PHASE_LABEL[w.phase]}
                        {current ? ' · conseillée maintenant' : ''}
                      </span>
                      <span className="block text-[16px] font-semibold text-ink">{w.title}</span>
                    </span>
                    <span className="flex gap-1.5 shrink-0" aria-label={`${acts.filter((a) => data.doneIds.has(a.id)).length} sur 3 déjà vécues`}>
                      {acts.map((a) => (
                        <span key={a.id} className={`w-2.5 h-2.5 rounded-full ${data.doneIds.has(a.id) ? 'bg-accent' : 'border border-line2'}`} />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="mt-10">
            <h2 className="nc-eyebrow mb-3">La bibliothèque</h2>
            <div className="overflow-x-auto scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
              <PillGroup label="Rayons" value={shelf} options={SHELVES} onChange={setShelf} />
            </div>
            <div className="mt-5 space-y-3">
              {library.map((a) => (
                <FicheRow key={a.id} a={a} done={data.doneIds.has(a.id)} />
              ))}
              {library.length === 0 && <p className="text-[15px] text-soft py-6">Ce rayon se remplira au fil des semaines.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function ProgrammePage() {
  return <P3Frame>{(ctx) => <Programme ctx={ctx} />}</P3Frame>;
}
