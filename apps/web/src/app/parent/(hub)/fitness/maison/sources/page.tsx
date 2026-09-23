'use client';

// E9 — « Les sources de la méthode » : toutes les sources des fiches servies,
// dédoublonnées, triées par auteur, avec leur niveau et les fiches qui les citent.
// Enfouies mais jamais introuvables (spec §3.4) : lien au pied de l'accueil.

import { useMemo } from 'react';
import Link from 'next/link';
import { P3Frame } from '@/components/parent/p3/P3Frame';
import { BackLink } from '@/components/parent/p3/pieces';
import { SOURCES_PAGE_TITLE, TERMS_LINE } from '@/lib/p3-moments/guide';
import { P3_BASE, p3Pool } from '@/lib/p3-moments/app';

const LEVEL_NOTE =
  'Niveau A : fondé sur des études solides. Niveau B : adaptation THRIVE cohérente avec la recherche. Niveau C : choix pédagogique de terrain.';

function Sources() {
  const sources = useMemo(() => {
    const map = new Map<string, { citation: string; level: string; fiches: { id: string; title: string }[] }>();
    for (const a of p3Pool()) {
      for (const s of a.sources) {
        const entry = map.get(s.citation) ?? { citation: s.citation, level: s.level, fiches: [] };
        if (!entry.fiches.some((f) => f.id === a.id)) entry.fiches.push({ id: a.id, title: a.title });
        map.set(s.citation, entry);
      }
    }
    return [...map.values()].sort((x, y) => x.citation.localeCompare(y.citation, 'fr'));
  }, []);

  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[30px] md:text-[36px] font-semibold text-ink mt-2">{SOURCES_PAGE_TITLE}</h1>
      <p className="mt-3 text-[14px] leading-[1.5] text-soft">{LEVEL_NOTE}</p>
      <ul className="mt-6 space-y-3">
        {sources.map((s) => (
          <li key={s.citation} className="nc-row p-4">
            <p className="text-[15px] leading-[1.5] text-ink">{s.citation}</p>
            <p className="mt-1 text-[13px] text-soft">Niveau {s.level}</p>
            <p className="mt-2 text-[13px] text-faint">
              {s.fiches.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && ' · '}
                  <Link href={`${P3_BASE}/${f.id}`} className="underline underline-offset-2 hover:text-ink">
                    {f.title}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-[13px] leading-[1.5] text-faint">{TERMS_LINE}</p>
    </div>
  );
}

export default function SourcesPage() {
  return <P3Frame>{() => <Sources />}</P3Frame>;
}
