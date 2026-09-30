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
import { InlineMd, frTypo } from '@/components/parent/p3/InlineMd';
import { BackLink, DurationPills, PillarTag, Section } from '@/components/parent/p3/pieces';
import { excludeTonight } from '@/components/parent/p3/session';
import {
  DURATION_WORDS,
  effectiveDuration,
  getActivity,
  getWeek,
  isVisible,
  plainAction,
  plainSession,
  resolveActivity,
  type Duration,
  type P3Activity,
  type Place,
} from '@/lib/p3-moments';
import { PILLAR_PLAIN, ROLE_LABELS } from '@/lib/p3-moments/guide';
import { timerSummary } from '@/components/parent/p3/StepTimer';
import { VISUAL_LABELS } from '@/components/parent/p3/Visuals';
import { Arch } from '@/components/parent/p3/Arch';
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
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    // Ordinateur et iPad paysage : deux colonnes — l'identité de l'activité
    // (titre, vignette) reste visible à gauche pendant la lecture de la fiche.
    // Sur téléphone et iPad portrait, l'ordre de lecture est inchangé.
    <article className="max-w-2xl lg:max-w-none pb-40 md:pb-8 lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-x-12 xl:gap-x-16 lg:items-start">
      <div className="lg:sticky lg:top-24">
        <BackLink href={P3_BASE} label="Maison" />

        <p className="nc-eyebrow mt-3">
          {activity.programme === 'bonus'
            ? 'Bonus · hors programme'
            : `Semaine ${activity.week} · ${activity.programme === 'complement' ? 'Pour aller plus loin · ' : ''}${ROLE_LABELS[activity.role]}`}
        </p>
        <h1 className="font-display text-[35px] md:text-[44px] leading-[1.05] font-medium text-ink mt-2 text-balance">
          {activity.title}
        </h1>
        <p className="text-[15px] text-soft mt-1.5">{activity.subtitle}</p>
        {after && (
          <p className="text-[14px] text-soft mt-1">
            À faire après{' '}
            <Link href={`${P3_BASE}/${after.id}`} className="font-semibold text-accent-ink underline underline-offset-4">
              « {after.title} »
            </Link>
            {ctx.data.doneIds.has(after.id) ? ' (déjà vécue)' : ''}
          </p>
        )}

        {/* L'arche : la vignette de l'activité. L'enfant comprend l'activité sans lire son but. */}
        <Arch activityId={activity.id} className="mt-6 w-[min(330px,86vw)] lg:w-full lg:max-w-[400px] mx-auto lg:mx-0" />
      </div>

      <div className="min-w-0 lg:max-w-2xl lg:pt-[52px]">
        {/* L'objectif de développement, relié à la séance : ce qu'on travaille vraiment */}
        <section
          aria-label="Ce qu’on travaille"
          className="maison-print mt-8 lg:mt-0 rounded-[26px] px-6 pt-6 pb-5 md:p-7 motion-safe:-rotate-[0.3deg] text-[#022539]"
        >
          <p className="nc-eyebrow !text-[color:var(--paper-ink)]">Ce qu’on travaille</p>
          <p className="mt-2 font-display text-[28px] md:text-[32px] leading-[1.12] font-medium text-balance">
            {week?.skill ?? activity.subtitle}
          </p>
          <p className="mt-3.5 text-[16px] md:text-[17px] leading-[1.5]">
            <span className="font-bold">Objectif : </span>
            {activity.objective}
          </p>
          <dl className="mt-4 grid gap-2 text-[14px] leading-[1.45] text-[#33454f] [&_dt]:!text-[#56626b] [&_dd]:!text-[#33454f]">
            <div className="flex gap-2">
              <dt className="text-soft shrink-0">Avec le coach</dt>
              <dd className="text-body">{week ? plainSession(week.session_source) : 'Hors séance'}</dd>
            </div>
            {plainAction(week?.action) && (
              <div className="flex gap-2">
                <dt className="text-soft shrink-0">Axe</dt>
                <dd className="text-body">{plainAction(week?.action)}</dd>
              </div>
            )}
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

        {/* Barre de contexte : une puce par information */}
        <ul className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: 'timer' as const, text: `${r.duration} min` },
            { icon: 'child' as const, text: forChild(ctx) },
            { icon: 'home' as const, text: activity.places.map((p) => PLACE_LABELS[p]).join(' · ') },
            { icon: 'clipboard' as const, text: activity.materials.length ? activity.materials.join(', ') : 'Rien à préparer' },
            { icon: 'sparkle' as const, text: `Énergie : ${activity.parent_energy}` },
            ...(activity.participants ? [{ icon: 'users' as const, text: activity.participants }] : []),
          ].map((c) => (
            <li key={c.text} className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-full bg-chip border border-line text-[13.5px] text-body">
              <Icon name={c.icon} className="w-4 h-4 text-sage-ink shrink-0" />
              {c.text}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <PillarTag pillar={activity.pillar_main} />
        </div>

        {available.length > 1 && (
          <div className="maison-seg mt-5">
            <DurationPills value={duration} available={available} onChange={setDuration} />
          </div>
        )}

        {/* Le seul endroit où le texte est aussi grand que le titre */}
        <Section title="Ce que tu dis pour commencer">
          <div className="relative rounded-[26px_26px_26px_8px] bg-[color-mix(in_srgb,var(--surface)_70%,var(--text)_6%)] border border-line2 px-6 pt-7 pb-4 shadow-[var(--shadow)]">
            <span aria-hidden className="absolute left-5 -top-1 font-display text-[84px] leading-none text-sage opacity-60 select-none">“</span>
            <p className="relative mt-3 font-display italic text-[25px] md:text-[30px] leading-[1.3] text-ink text-pretty" aria-live="polite">
              {frTypo(r.opener)}
            </p>
            <button
              type="button"
              onClick={copy}
              className="mt-3 inline-flex items-center gap-2 min-h-[44px] text-[14px] font-semibold text-sage-ink"
            >
              <Icon name={copied ? 'check' : 'clipboard'} className="w-[18px] h-[18px]" />
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
          <ol className="flex flex-col gap-6">
            {r.steps.map((s, i) => (
              <li key={i} className="relative flex gap-4 text-[16px] leading-[1.55] text-body">
                {i < r.steps.length - 1 && (
                  <span aria-hidden className="absolute left-[17px] top-10 -bottom-6 border-l-2 border-dotted border-sage/60" />
                )}
                <span
                  aria-hidden
                  className="relative grid place-items-center w-9 h-9 shrink-0 rounded-full bg-night-surface border-[1.5px] border-sage font-display text-[18px] font-semibold text-ink"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 pt-1">
                  <InlineMd text={s} />
                  {(activity.guide[i]?.timer || activity.guide[i]?.visual) && (
                    <span className="mt-2.5 flex flex-wrap gap-2 text-[13.5px] font-semibold text-sage-ink">
                      {activity.guide[i].timer && (
                        <span className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-full bg-sage/15 border border-sage/30">
                          <Icon name="timer" className="w-4 h-4" /> Minuteur {timerSummary(activity.guide[i].timer!)}
                        </span>
                      )}
                      {activity.guide[i].visual && (
                        <span className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-full bg-sage/15 border border-sage/30">
                          <Icon name="eye" className="w-4 h-4" /> À montrer : {VISUAL_LABELS[activity.guide[i].visual!]}
                        </span>
                      )}
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
          <ul className="nc-card space-y-4">
            {r.donts.map((d, i) => (
              <li key={i} className="flex gap-3 items-start text-[16px] leading-[1.5] text-ink">
                <span aria-hidden className="grid place-items-center w-[26px] h-[26px] mt-px shrink-0 rounded-full bg-sage/15 text-sage-ink">
                  <Icon name="close" className="w-3.5 h-3.5" strokeWidth={2.4} />
                </span>
                <InlineMd text={d} />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Ce que tu vas voir">
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
            <button type="button" onClick={() => setWhyLevel(1)} className="mt-2 min-h-[44px] text-[14px] font-semibold text-sage-ink">
              Le détail
            </button>
          )}
          {whyLevel >= 1 && (
            <div className="mt-3 space-y-2">
              <p className="text-[15px] leading-[1.6] text-body">{activity.why_detail}</p>
              <p className="text-[13px] text-soft">{activity.method_ref}</p>
              {whyLevel === 1 && (
                <button type="button" onClick={() => setWhyLevel(2)} className="min-h-[44px] text-[14px] font-semibold text-sage-ink">
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
        <div className="fixed md:static inset-x-0 bottom-[calc(max(14px,env(safe-area-inset-bottom))+74px)] z-sticky px-[14px] md:px-0 md:mt-8">
          <div className="max-w-2xl mx-auto flex items-center gap-1 rounded-[34px] md:rounded-none p-1.5 md:p-0 bg-[var(--tab)] backdrop-blur-[18px] backdrop-saturate-[1.4] md:backdrop-blur-none md:bg-transparent border border-line2 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.1)] md:border-0 md:shadow-none">
            <Link
              href={launchHref}
              className="maison-launch flex-1 inline-flex items-center justify-center gap-2.5 h-[52px] rounded-full text-accent-on font-bold text-[17px]"
            >
              <Icon name="play" className="w-[18px] h-[18px]" />
              Lancer
            </Link>
            {/* Actions secondaires : icône + libellé court, à la hauteur de « Lancer »
                (la barre ne grandit pas, chaque bouton dit ce qu'il fait). */}
            <button
              type="button"
              onClick={() => ctx.data.toggleSaved(activity.id, 'FAVORI')}
              aria-pressed={fav}
              aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={FICHE_ACTION}
            >
              <Icon name="star" className={`w-5 h-5 ${fav ? 'text-accent-ink' : ''}`} strokeWidth={fav ? 2.6 : 1.9} />
              <span aria-hidden>Favori</span>
            </button>
            <button
              type="button"
              onClick={() => ctx.data.toggleSaved(activity.id, 'DE_COTE')}
              aria-pressed={aside}
              aria-label={aside ? 'Ne plus mettre de côté' : 'Mettre de côté'}
              className={FICHE_ACTION}
            >
              <Icon name="flag" className={`w-5 h-5 ${aside ? 'text-accent-ink' : ''}`} />
              <span aria-hidden>De côté</span>
            </button>
            <button type="button" onClick={otherActivity} aria-label="Autre activité" className={FICHE_ACTION}>
              <Icon name="refresh" className="w-5 h-5" />
              <span aria-hidden>Autre</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const FICHE_ACTION =
  'shrink-0 w-[58px] h-[52px] rounded-[26px] inline-flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold leading-none text-soft hover:text-ink hover:bg-surface-sub transition-colors';

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
