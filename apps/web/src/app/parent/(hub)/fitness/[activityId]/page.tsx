'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E3 — La fiche. Lire en 20 secondes, décider, lancer.
// Tout le texte vient de activities.generated.json via resolveActivity() (R1) ;
// `origin` et `why_it_fails` ne s'affichent jamais ici.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui';
import { P3Frame, forChild, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { InlineMd } from '@/components/parent/p3/InlineMd';
import { BackLink, DurationPills, PillarTag, Section } from '@/components/parent/p3/pieces';
import { excludeTonight } from '@/components/parent/p3/session';
import {
  DURATION_WORDS,
  effectiveDuration,
  getActivity,
  getWeek,
  isVisible,
  resolveActivity,
  type Duration,
  type P3Activity,
  type Place,
} from '@/lib/p3-moments';
import { PILLAR_PLAIN, ROLE_LABELS } from '@/lib/p3-moments/guide';
import { timerSummary } from '@/components/parent/p3/StepTimer';
import { VISUAL_LABELS } from '@/components/parent/p3/Visuals';
import { BAND_LABELS } from '@/lib/p3-moments/shelves';
import { P3_BASE, p3Pool, parseBand, parseDuration, parsePlace } from '@/lib/p3-moments/app';

const PLACE_LABELS: Record<Place, string> = {
  maison: 'À la maison',
  exterieur: 'Dehors',
  voiture: 'En voiture',
  partout: 'Partout',
};

const EXT_LABELS = { approfondir: 'Approfondir', ancrer: 'Ancrer', transferer: 'Transférer' } as const;

const LEVEL_NOTE =
  'Niveau A : fondé sur des études solides. Niveau B : adaptation THRIVE cohérente avec la recherche. Niveau C : choix pédagogique de terrain.';

function FicheInner({ ctx, activity, bandOverride }: { ctx: P3Ctx; activity: P3Activity; bandOverride: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const place = parsePlace(search.get('lieu'));
  const requested = parseDuration(search.get('duree'));
  const available = activity.durations;
  const [duration, setDuration] = useState<Duration>(effectiveDuration(activity, requested) ?? activity.base_duration);
  const [whyLevel, setWhyLevel] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const r = resolveActivity(activity, duration, ctx.band)!;
  const week = getWeek(activity.week);
  const after = activity.after ? getActivity(activity.after) : null;
  const fav = ctx.data.saved.favoris.has(activity.id);
  const aside = ctx.data.saved.deCote.has(activity.id);
  const launchHref = `${P3_BASE}/${activity.id}/moment?duree=${r.duration}&lieu=${place}${bandOverride ? `&bande=${ctx.band}` : ''}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.opener.replace(/^«\s*|\s*»$/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Presse-papier indisponible : le bouton ne fait simplement rien.
    }
  };

  const otherActivity = () => {
    excludeTonight(ctx.child.id, activity.id);
    router.push(P3_BASE);
  };

  return (
    <article className="max-w-2xl pb-40 md:pb-8">
      <BackLink href={P3_BASE} label="Maison" />

      <p className="nc-eyebrow mt-3">
        {activity.programme === 'bonus'
          ? 'Bonus · hors programme'
          : `Semaine ${activity.week} · ${activity.programme === 'complement' ? 'Pour aller plus loin · ' : ''}${ROLE_LABELS[activity.role]}`}
      </p>
      <h1 className="font-display text-[32px] md:text-[40px] leading-[1.12] font-semibold text-ink mt-2">
        {activity.title}
      </h1>
      <p className="text-[15px] text-soft mt-1.5">{activity.subtitle}</p>
      {after && (
        <p className="text-[14px] text-soft mt-1">
          À faire après{' '}
          <Link href={`${P3_BASE}/${after.id}`} className="font-semibold text-accent-ink underline underline-offset-4">
            « {after.title} »
          </Link>
          {ctx.data.doneIds.has(after.id) ? ' (déjà vécue)' : ''}
        </p>
      )}

      {/* L'objectif de développement, relié à la séance : ce qu'on travaille vraiment */}
      <section
        aria-label="Ce qu’on travaille"
        className="mt-5 rounded-[24px] p-5 md:p-6 bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] ring-2 ring-accent-line"
      >
        <p className="nc-eyebrow">Ce qu’on travaille</p>
        <p className="mt-2 font-display text-[26px] md:text-[30px] leading-[1.15] font-semibold text-ink">
          {week?.skill ?? activity.subtitle}
        </p>
        <p className="mt-3 text-[17px] leading-[1.5] text-ink">
          <span className="font-semibold">Objectif : </span>
          {activity.objective}
        </p>
        <dl className="mt-4 grid gap-2 text-[14px] leading-[1.45]">
          <div className="flex gap-2">
            <dt className="text-soft shrink-0">Séance</dt>
            <dd className="text-body">
              {week?.session_source ?? 'Hors séance'}
              {week?.action && week.action !== '—' ? ` · ${week.action}` : ''}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-soft shrink-0">Pilier</dt>
            <dd className="text-body">{PILLAR_PLAIN[activity.pillar_main]}</dd>
          </div>
          {week && (
            <div className="flex gap-2">
              <dt className="text-soft shrink-0">Semaine {week.week}</dt>
              <dd className="text-body">{week.opening_line}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Barre de contexte */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-soft">
        <li className="inline-flex items-center gap-1.5">
          <Icon name="play" className="w-3.5 h-3.5 text-accent-ink" /> {r.duration} min
        </li>
        <li>{forChild(ctx)}</li>
        <li>{activity.places.map((p) => PLACE_LABELS[p]).join(' · ')}</li>
        <li>{activity.materials.length ? activity.materials.join(', ') : 'Rien à préparer'}</li>
        <li>Énergie : {activity.parent_energy}</li>
        {activity.participants && <li>{activity.participants}</li>}
      </ul>
      <div className="mt-3">
        <PillarTag pillar={activity.pillar_main} />
      </div>

      {available.length > 1 && (
        <div className="mt-6">
          <DurationPills value={duration} available={available} onChange={setDuration} />
        </div>
      )}

      {/* Le seul endroit où le texte est aussi grand que le titre */}
      <Section title="Ce que vous dites pour commencer">
        <div className="nc-card ring-1 ring-accent-line">
          <p className="font-display text-[26px] md:text-[32px] leading-[1.25] text-ink" aria-live="polite">
            {r.opener}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-4 min-h-[44px] text-[14px] font-semibold text-accent-ink underline underline-offset-4"
          >
            {copied ? 'Phrase copiée' : 'Copier la phrase'}
          </button>
        </div>
      </Section>

      {activity.safety && (
        <Section title="À savoir avant de commencer">
          <p className="nc-row p-4 text-[15px] leading-[1.55] text-body">
            <InlineMd text={activity.safety} />
          </p>
        </Section>
      )}

      <Section title="Le déroulé">
        <ol className="space-y-3">
          {r.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[16px] leading-[1.55] text-body">
              <span className="font-display text-[18px] font-semibold text-accent-ink w-6 shrink-0">{i + 1}</span>
              <span>
                <InlineMd text={s} />
                {(activity.guide[i]?.timer || activity.guide[i]?.visual) && (
                  <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold text-accent-ink">
                    {activity.guide[i].timer && <span>⏱ Minuteur {timerSummary(activity.guide[i].timer!)}</span>}
                    {activity.guide[i].visual && <span>👁 À montrer : {VISUAL_LABELS[activity.guide[i].visual!]}</span>}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
        {r.variant && (
          <div className="nc-row p-4 mt-5">
            <p className="nc-eyebrow mb-1.5">
              {bandOverride ? (
                `Version ${BAND_LABELS[ctx.band]}`
              ) : (
                <>
                  Pour {ctx.firstName}
                  {ctx.age !== null ? `, à ${ctx.age} ans` : ''}
                </>
              )}
            </p>
            <p className="text-[15px] leading-[1.55] text-body whitespace-pre-line">
              <InlineMd text={r.variant} />
            </p>
          </div>
        )}
      </Section>

      {/* La valeur du produit : mise en avant forte */}
      <Section title={`À éviter pendant ces ${DURATION_WORDS[r.duration]}`}>
        <ul className="nc-card space-y-3">
          {r.donts.map((d, i) => (
            <li key={i} className="flex gap-2 text-[16px] leading-[1.55] text-ink">
              <span aria-hidden className="text-accent-ink font-bold">—</span>
              <InlineMd text={d} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Ce que vous allez voir">
        <p className="text-[16px] leading-[1.6] text-body">
          <InlineMd text={r.what_you_will_see} />
        </p>
      </Section>

      {activity.extensions.length > 0 && (
        <div className="mt-6 space-y-3">
          {activity.extensions.map((e) => {
            const open = e.adds_to <= r.duration;
            return (
              <div
                key={e.adds_to}
                className="grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none"
                style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
                aria-hidden={!open}
              >
                <div className="overflow-hidden">
                  <div className="nc-row p-4">
                    <p className="nc-eyebrow mb-1.5">+10 min — {EXT_LABELS[e.kind]}</p>
                    <p className="text-[15px] leading-[1.55] text-body whitespace-pre-line">
                      <InlineMd text={e.text} />
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pourquoi ça marche — 3 niveaux : une ligne → le détail → la source */}
      <Section title="Pourquoi ça marche">
        <div className="flex gap-2.5">
          <span aria-hidden className="w-6 h-6 rounded-full border border-line2 grid place-items-center text-[13px] font-bold text-soft shrink-0">
            i
          </span>
          <p className="text-[15px] leading-[1.55] text-body">{activity.why_one_line}</p>
        </div>
        {whyLevel === 0 && (
          <button type="button" onClick={() => setWhyLevel(1)} className="mt-2 min-h-[44px] text-[14px] font-semibold text-accent-ink">
            Le détail
          </button>
        )}
        {whyLevel >= 1 && (
          <div className="mt-3 space-y-2">
            <p className="text-[15px] leading-[1.6] text-body">{activity.why_detail}</p>
            <p className="text-[13px] text-soft">{activity.method_ref}</p>
            {whyLevel === 1 && (
              <button type="button" onClick={() => setWhyLevel(2)} className="min-h-[44px] text-[14px] font-semibold text-accent-ink">
                La source
              </button>
            )}
          </div>
        )}
        {whyLevel === 2 && (
          <div className="mt-3">
            <ul className="space-y-2">
              {activity.sources.map((s) => (
                <li key={s.citation} className="text-[14px] leading-[1.5] text-body">
                  {s.citation} <span className="text-soft">— Niveau {s.level}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-soft mt-3">{LEVEL_NOTE}</p>
          </div>
        )}
      </Section>


      {/* Actions — collantes sur mobile, au-dessus de la barre d'onglets */}
      <div className="fixed md:static inset-x-0 bottom-[84px] z-40 px-5 md:px-0 md:mt-8">
        <div className="max-w-2xl mx-auto flex items-center gap-2 rounded-full md:rounded-none p-2 md:p-0 bg-night-bg md:bg-transparent">
          <Link
            href={launchHref}
            className="flex-1 inline-flex items-center justify-center gap-2 h-[52px] rounded-full bg-accent text-accent-on font-bold text-base"
          >
            <Icon name="play" className="w-[18px] h-[18px]" />
            Lancer
          </Link>
          <button
            type="button"
            onClick={() => ctx.data.toggleSaved(activity.id, 'FAVORI')}
            aria-pressed={fav}
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="nc-iconbtn shrink-0"
          >
            <Icon name="star" className={`w-5 h-5 ${fav ? 'text-accent-ink' : ''}`} strokeWidth={fav ? 2.6 : 1.9} />
          </button>
          <button
            type="button"
            onClick={() => ctx.data.toggleSaved(activity.id, 'DE_COTE')}
            aria-pressed={aside}
            aria-label={aside ? 'Ne plus mettre de côté' : 'Mettre de côté'}
            className="nc-iconbtn shrink-0"
          >
            <Icon name="flag" className={`w-5 h-5 ${aside ? 'text-accent-ink' : ''}`} />
          </button>
          <button type="button" onClick={otherActivity} className="nc-pill min-h-[44px] shrink-0">
            Autre activité
          </button>
        </div>
      </div>
    </article>
  );
}

function FichePage() {
  const params = useParams<{ activityId: string }>();
  const search = useSearchParams();
  const activity = getActivity(String(params.activityId ?? ''));
  const inPool = !!activity && p3Pool().some((a) => a.id === activity.id);
  const band = parseBand(search.get('bande'));

  // Liberté totale : toute fiche publiée s'ouvre, quelle que soit la semaine en cours.
  // ?bande= (depuis le catalogue) montre la version d'une autre tranche d'âge.
  return (
    <P3Frame>
      {(ctx) =>
        // Un complément s'ouvre dès que sa semaine est ouverte (spec §0.3) ; une fiche cœur, toujours.
        activity && inPool && isVisible(activity, ctx.data.openWeek) ? (
          <FicheInner
            ctx={band ? { ...ctx, band } : ctx}
            activity={activity}
            bandOverride={band !== null && band !== ctx.band}
          />
        ) : (
          <div className="py-16 text-center">
            <p className="text-[16px] text-body">Cette fiche n&apos;est pas encore disponible.</p>
            <Link href={P3_BASE} className="inline-block mt-4 min-h-[44px] font-semibold text-accent-ink underline">
              Retour à Maison
            </Link>
          </div>
        )
      }
    </P3Frame>
  );
}

export default function Page() {
  return (
    <Suspense>
      <FichePage />
    </Suspense>
  );
}
