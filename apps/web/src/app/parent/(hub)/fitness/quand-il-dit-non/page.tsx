'use client';

// E8 — « Quand il dit non » : PAGE_NON dans l'ordre, la tranche de l'enfant en
// premier, puis une fiche anti-refus ouverte (pickTonight avec 2 refus).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { BackLink } from '@/components/parent/p3/pieces';
import { pickTonight } from '@/lib/p3-moments';
import { PAGE_NON } from '@/lib/p3-moments/guide';
import { P3_BASE, p3Pool } from '@/lib/p3-moments/app';

function PageNon({ ctx }: { ctx: P3Ctx }) {
  const [others, setOthers] = useState(false);
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), []);

  const mine = PAGE_NON.byAge.find((b) => b.band === ctx.band) ?? PAGE_NON.byAge[0];
  const rest = PAGE_NON.byAge.filter((b) => b !== mine);
  const soft = useMemo(
    () =>
      pickTonight({
        firstName: ctx.firstName,
        band: ctx.band,
        declaredDuration: 10,
        place: 'maison',
        parentEnergy: null,
        childMood: null,
        moments: ctx.data.moments,
        consecutiveRefusals: 2,
        now: new Date(),
        pool: p3Pool(),
      }),
    [ctx.firstName, ctx.band, ctx.data.moments]
  );

  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[30px] md:text-[36px] font-semibold text-ink mt-2">{PAGE_NON.title}</h1>
      <p className="mt-3 text-[17px] leading-[1.55] text-body">{PAGE_NON.intro}</p>

      <div className="nc-card mt-6">
        <p className="nc-eyebrow">{mine.band} ans</p>
        <p className="mt-2 text-[16px] leading-[1.55] text-ink">{mine.text}</p>
      </div>
      <button type="button" onClick={() => setOthers((o) => !o)} aria-expanded={others} className="mt-3 min-h-[44px] text-[14px] font-semibold text-accent-ink">
        Les autres âges
      </button>
      {others && (
        <div className="space-y-3">
          {rest.map((b) => (
            <div key={b.band} className="nc-row p-4">
              <p className="nc-eyebrow">{b.band} ans</p>
              <p className="mt-1.5 text-[15px] leading-[1.55] text-body">{b.text}</p>
            </div>
          ))}
        </div>
      )}

      {[PAGE_NON.worse, PAGE_NON.works].map((block) => (
        <section key={block.title} className="mt-8">
          <h2 className="nc-eyebrow mb-3">{block.title}</h2>
          <ul className="space-y-2">
            {block.items.map((it) => (
              <li key={it} className="flex gap-2 text-[16px] leading-[1.5] text-body">
                <span aria-hidden className="text-accent-ink">—</span>
                {it}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-10 font-display text-[28px] md:text-[34px] leading-[1.25] text-ink">{PAGE_NON.exitLine}</p>
      <p className="mt-2 text-[15px] text-soft">{PAGE_NON.exitNote}</p>

      {soft && (
        <Link
          href={`${P3_BASE}/${soft.activity.id}`}
          className="mt-8 inline-flex items-center gap-2 min-h-[52px] px-6 rounded-full border border-line2 text-[15px] font-semibold text-ink"
        >
          {PAGE_NON.ctaSoft} <Icon name="arrow-right" className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default function QuandIlDitNonPage() {
  return <P3Frame>{(ctx) => <PageNon ctx={ctx} />}</P3Frame>;
}
