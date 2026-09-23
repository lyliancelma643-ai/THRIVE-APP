'use client';

// E9 — « Quand consulter ». Tant que PAGE_CONSULTER.status = 'A_VALIDER' :
// visible en développement seulement, avec un bandeau interne ; en production
// la page n'est ni liée ni affichée (décision juridique de Lylian).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { P3Frame } from '@/components/parent/p3/P3Frame';
import { BackLink } from '@/components/parent/p3/pieces';
import { PAGE_CONSULTER, TERMS_LINE } from '@/lib/p3-moments/guide';
import { P3_BASE } from '@/lib/p3-moments/app';

const VISIBLE = PAGE_CONSULTER.status !== 'A_VALIDER' || process.env.NODE_ENV !== 'production';

/** « 1 800 263-2266 » → lien tel: ; « texto 514 600-1002 » / « PARLER au 686868 » → lien sms:. */
function Linkify({ text }: { text: string }) {
  const re = /(9-8-8|9-1-1|811|1 800 [\d-]+|\d{3} \d{3}-\d{4}|686868)/g;
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <span key={i}>{p}</span>;
        const digits = p.replace(/\D/g, '');
        const sms = /texto\s*$|au\s*$/.test(parts[i - 1] ?? '');
        return (
          <a key={i} href={`${sms ? 'sms' : 'tel'}:${digits}`} className="font-semibold text-accent-ink underline underline-offset-2">
            {p}
          </a>
        );
      })}
    </>
  );
}

function Consulter() {
  const c = PAGE_CONSULTER;
  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      {c.status === 'A_VALIDER' && (
        <p className="mt-3 nc-row-idle px-4 py-3 text-[13px] font-semibold text-soft">Contenu en validation — interne, non publié.</p>
      )}
      <h1 className="font-display text-[30px] md:text-[36px] font-semibold text-ink mt-4">{c.title}</h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-body">{c.intro}</p>

      <section className="mt-8">
        <h2 className="nc-eyebrow mb-3">{c.signals.title}</h2>
        <ul className="space-y-2 text-[16px] text-body">
          {c.signals.items.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="text-accent-ink">—</span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className="nc-card ring-1 ring-accent-line mt-8">
        <h2 className="nc-eyebrow">{c.urgent.title}</h2>
        <p className="mt-2 text-[16px] leading-[1.55] text-ink">
          <Linkify text={c.urgent.text} />
        </p>
      </section>

      <section className="mt-8">
        <h2 className="nc-eyebrow mb-3">{c.whoToCall.title}</h2>
        <ul className="space-y-2.5 text-[15px] leading-[1.5] text-body">
          {c.whoToCall.items.map((s) => (
            <li key={s}>
              <Linkify text={s} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-faint">{c.whoToCall.verifyNote}</p>
      </section>

      <p className="mt-8 text-[15px] text-soft">{c.inApp}</p>
      <p className="mt-6 text-[13px] leading-[1.5] text-faint">{TERMS_LINE}</p>
    </div>
  );
}

export default function QuandConsulterPage() {
  const router = useRouter();
  useEffect(() => {
    if (!VISIBLE) router.replace(P3_BASE);
  }, [router]);
  if (!VISIBLE) return null;
  return <P3Frame>{() => <Consulter />}</P3Frame>;
}
