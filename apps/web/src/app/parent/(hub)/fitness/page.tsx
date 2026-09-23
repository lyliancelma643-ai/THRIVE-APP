'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E1 — Accueil « Maison » (programme P3), à la place de l'ancien onglet Fitness, façon plateforme de streaming.
// Le parent fatigué de 19 h 15 lance un moment en 1 tap sans rien choisir (l'affiche du soir, pickTonight),
// ou choisit librement dans les rangées et le catalogue — jamais plus de 3 taps.
// E10 — Onboarding au premier accès (clé localStorage thrive.p3.welcomeSeen).
//
// Anti-culpabilité (R3) : le compteur cumulatif est l'indicateur principal ;
// une série n'apparaît que si weeklyStreak() renvoie un nombre ; aucun « 0 »,
// aucun mot de manque. Tout texte de fiche vient du JSON généré (R1).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { DurationPills, PillGroup } from '@/components/parent/p3/pieces';
import { PosterArt, PosterRow } from '@/components/parent/p3/Poster';
import { usePageScrollMemory } from '@/components/parent/p3/scrollMemory';
import { useHScroll } from '@/components/parent/p3/useHScroll';
import {
  addRefusal,
  excludeTonight,
  popWeekDone,
  readEvening,
  readFlag,
  readLocalJSON,
  readPrefDuration,
  writeFlag,
  writeLocalJSON,
  writePrefDuration,
} from '@/components/parent/p3/session';
import {
  DURATION_WORDS,
  REWARDS,
  getActivity,
  getWeek,
  pickTonight,
  type Duration,
  type P3Activity,
  type RewardId,
} from '@/lib/p3-moments';
import { BILAN_4_SEMAINES, DEFAULT_OPENER, PAGE_CONSULTER, PAGE_NON, ROLE_LABELS, TERMS_LINE } from '@/lib/p3-moments/guide';
import {
  DURATIONS,
  P3_BASE,
  PLACE_CHOICES,
  captureText,
  fill,
  formatLongDate,
  p3Pool,
} from '@/lib/p3-moments/app';
import { buildShelves } from '@/lib/p3-moments/shelves';

type PlaceChoice = (typeof PLACE_CHOICES)[number]['id'];

const IS_DEV = process.env.NODE_ENV !== 'production';

// ── E10 — Onboarding ─────────────────────────────────────────────────────────
function Onboarding({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [i]);
  const screens = [
    <>
      <h1 className="font-display text-[32px] md:text-[42px] leading-[1.15] font-semibold text-ink">
        13 semaines. 10 minutes. Vous et {firstName}.
      </h1>
      <p className="mt-4 text-[17px] leading-[1.55] text-body">
        Chaque semaine reprend une étape de la Méthode THRIVE. Vous n&apos;avez rien à préparer et rien à évaluer.
      </p>
    </>,
    <>
      <p className="font-display text-[28px] md:text-[36px] leading-[1.25] text-ink">
        « {fill(DEFAULT_OPENER, { duree: DURATION_WORDS[10] })} »
      </p>
      <p className="mt-4 text-[17px] leading-[1.55] text-body">Voilà la phrase qui ouvre tout. Vous la direz souvent.</p>
    </>,
    <>
      <h1 className="font-display text-[28px] md:text-[36px] leading-[1.2] font-semibold text-ink">Et s&apos;il dit non ?</h1>
      <p className="mt-4 text-[17px] leading-[1.55] text-body">{PAGE_NON.intro}</p>
      <p className="mt-2 text-[17px] leading-[1.55] text-ink">{PAGE_NON.exitLine}</p>
      <Link href={`${P3_BASE}/quand-il-dit-non`} className="inline-block mt-4 min-h-[44px] font-semibold text-accent-ink underline">
        {PAGE_NON.title}
      </Link>
    </>,
    <>
      <h1 className="font-display text-[28px] md:text-[36px] leading-[1.2] font-semibold text-ink">
        Il n&apos;y a ni retard, ni série à défendre. Trois moments par semaine, c&apos;est déjà réussi.
      </h1>
      <p className="mt-6 text-[13px] leading-[1.5] text-faint">{TERMS_LINE}</p>
    </>,
  ];
  const last = i === screens.length - 1;
  return (
    <div className="max-w-xl py-8 md:py-14 animate-om-up" key={i}>
      <p className="nc-eyebrow mb-4">Maison · {i + 1} / {screens.length}</p>
      {screens[i]}
      <div className="mt-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="h-[56px] px-8 rounded-full bg-accent text-accent-on font-bold text-[17px]"
        >
          {last ? 'Commencer la semaine 1' : 'Suivant'}
        </button>
        {!last && (
          <button type="button" onClick={onDone} className="min-h-[48px] px-3 text-[15px] font-semibold text-soft">
            Passer
          </button>
        )}
      </div>
    </div>
  );
}

// ── Bilan court à 4 semaines (ressenti, jamais un score — stocké en local en V1) ──
function Bilan4Semaines({ ctx }: { ctx: P3Ctx }) {
  const key = `thrive.p3.bilan4.${ctx.child.id}`;
  const [state, setState] = useState<'hidden' | 'closed' | 'open'>('hidden');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [feeling, setFeeling] = useState<string | null>(null);

  useEffect(() => {
    const first = ctx.data.firstMomentAt;
    const due = first && Date.now() - new Date(first).getTime() >= 28 * 864e5;
    setState(due && !readLocalJSON(key, null) ? 'closed' : 'hidden');
  }, [ctx.data.firstMomentAt, key]);

  if (state === 'hidden') return null;
  const title = fill(BILAN_4_SEMAINES.title, { prenom: ctx.firstName });
  const close = (payload: unknown) => {
    writeLocalJSON(key, payload);
    setState('hidden');
  };

  return (
    <section className="nc-card mt-8">
      <p className="nc-eyebrow">Pour vous</p>
      <p className="font-display text-[21px] font-semibold text-ink mt-1">{title}</p>
      {state === 'closed' ? (
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => setState('open')} className="h-11 px-5 rounded-full bg-accent text-accent-on font-bold text-[15px]">
            Répondre
          </button>
          <button type="button" onClick={() => close({ dismissed_at: new Date().toISOString() })} className="min-h-[44px] px-3 text-[15px] font-semibold text-soft">
            Plus tard
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-[15px] text-soft">{BILAN_4_SEMAINES.intro}</p>
          {BILAN_4_SEMAINES.questions.map((q, i) => (
            <label key={i} className="block mt-5">
              <span className="text-[16px] text-ink">{fill(q, { prenom: ctx.firstName })}</span>
              <textarea
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                rows={2}
                maxLength={800}
                className="mt-2 w-full rounded-[16px] bg-field border border-line2 p-3 text-[15px] text-ink"
              />
            </label>
          ))}
          <p className="mt-6 text-[16px] text-ink">{fill(BILAN_4_SEMAINES.guiltScale.label, { prenom: ctx.firstName })}</p>
          <div className="mt-3">
            <PillGroup
              label={BILAN_4_SEMAINES.guiltScale.label}
              value={feeling ?? ''}
              options={BILAN_4_SEMAINES.guiltScale.options.map((o) => ({ value: o, label: o }))}
              onChange={(v) => setFeeling(v)}
            />
          </div>
          <p className="mt-3 text-[13px] text-soft">{BILAN_4_SEMAINES.guiltScale.note}</p>
          <button
            type="button"
            onClick={() => close({ answered_at: new Date().toISOString(), answers, feeling })}
            className="mt-6 h-12 px-6 rounded-full bg-accent text-accent-on font-bold text-[15px]"
          >
            Garder
          </button>
        </div>
      )}
    </section>
  );
}

// ── E1 — Accueil, façon plateforme de streaming ──────────────────────────────
// L'affiche du soir (pickTonight) se lance en 1 tap ; chaque rangée porte son
// message de recommandation ; « Toutes les activités » ouvre le catalogue trié
// par âge. Trois taps au plus pour lancer n'importe quelle fiche.
const HERO_VEIL = 'linear-gradient(to top, rgba(6,22,30,.97) 0%, rgba(6,22,30,.78) 42%, rgba(6,22,30,.1) 100%)';

function Home({ ctx }: { ctx: P3Ctx }) {
  const router = useRouter();
  const { data, firstName, child } = ctx;
  const fitnessEnabled = useAccessStore((st) => st.access?.fitnessEnabled === true);
  const [duration, setDuration] = useState<Duration>(10);
  const [place, setPlace] = useState<PlaceChoice>('maison');
  const [evening, setEvening] = useState(() => ({ day: '', excluded: [] as string[], refusals: 0 }));
  const [menu, setMenu] = useState(false);
  const [weekDone, setWeekDone] = useState<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const shortcuts = useHScroll();

  // Retour depuis une fiche (bouton ou geste) : on retrouve la page là où on l'a laissée.
  usePageScrollMemory(`maison:${child.id}`);

  useEffect(() => {
    setEvening(readEvening(child.id));
    setWeekDone(popWeekDone(child.id));
    setDuration(data.lastDuration ?? readPrefDuration() ?? 10);
    // Préférences de départ : lues une fois à l'arrivée sur l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  const chooseDuration = (d: Duration) => {
    setDuration(d);
    writePrefDuration(d);
  };

  const all = useMemo(() => p3Pool(), []);
  const pool = useMemo(
    () => all.filter((a) => !evening.excluded.includes(a.id) && !data.saved.deCote.has(a.id)),
    [all, evening.excluded, data.saved.deCote]
  );

  const pick = useMemo(
    () =>
      pickTonight({
        firstName,
        band: ctx.band,
        declaredDuration: duration,
        place,
        parentEnergy: null,
        childMood: null,
        moments: data.moments,
        consecutiveRefusals: evening.refusals,
        now: new Date(),
        pool,
      }),
    [firstName, ctx.band, duration, place, data.moments, evening.refusals, pool]
  );

  const firstMoment = data.count === 0;
  const a = pick?.activity ?? null;

  const lastRating = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const x of data.moments) if (!m.has(x.activity_id)) m.set(x.activity_id, x.rating);
    return m;
  }, [data.moments]);

  const shelves = useMemo(
    () =>
      buildShelves({
        pool: all,
        firstName,
        openWeek: data.openWeek,
        doneIds: data.doneIds,
        lastRating,
        favoris: data.saved.favoris,
        deCote: data.saved.deCote,
        now: new Date(),
        heroId: a?.id ?? null,
      }),
    [all, firstName, data.openWeek, data.doneIds, lastRating, data.saved, a?.id]
  );

  const favourite = useMemo(() => {
    const five = data.moments.find((m) => m.rating === 5);
    return five ? getActivity(five.activity_id) : null;
  }, [data.moments]);

  const doneWeek = weekDone ? getWeek(weekDone) : null;
  const doneUnlock = doneWeek?.unlocks && data.rewards.has(doneWeek.unlocks as RewardId) ? doneWeek.unlocks : null;

  // Menu « … » : se ferme en touchant ailleurs ou avec Échap.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!heroRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    // Capture : les rangées arrêtent la propagation de leurs gestes.
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const skip = async (kind: 'PAS_LE_TEMPS' | 'DE_COTE' | 'REFUS_ENFANT') => {
    if (!a) return;
    setMenu(false);
    if (kind === 'DE_COTE') {
      await data.toggleSaved(a.id, 'DE_COTE');
      return;
    }
    if (kind === 'REFUS_ENFANT') setEvening(addRefusal(child.id, a.id));
    else setEvening(excludeTonight(child.id, a.id));
    await data.recordSkip(a.id, kind);
  };

  const q = `duree=${duration}&lieu=${place}`;
  const ficheHref = (x: P3Activity) => `${P3_BASE}/${x.id}?${q}`;
  const launchHref = a ? `${P3_BASE}/${a.id}/moment?${q}` : '';
  const isDone = (x: P3Activity) => data.doneIds.has(x.id);

  return (
    <div>
      {doneWeek && (
        <div className="nc-card ring-1 ring-accent-line mb-5 animate-om-up">
          <p className="font-display text-[20px] font-semibold text-ink">Semaine {doneWeek.week} complète.</p>
          {doneUnlock && (
            <Link href={`${P3_BASE}/objets/${doneUnlock}`} className="inline-flex items-center gap-1.5 mt-2 min-h-[44px] font-semibold text-accent-ink">
              {fill(REWARDS.find((r) => r.id === doneUnlock)!.label, { prenom: firstName })}
              <Icon name="arrow-right" className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {/* L'AFFICHE DU SOIR — la recommandation, lançable en un tap */}
      {a && pick ? (
        <section
          ref={heroRef}
          className="relative rounded-[26px] overflow-hidden flex flex-col justify-end min-h-[460px] md:min-h-[480px] md:h-[56vh] cursor-pointer animate-om-up select-none [-webkit-touch-callout:none]"
          onClick={() => {
            // Menu ouvert : toucher l'affiche referme le menu, sans ouvrir la fiche.
            if (menu) setMenu(false);
            else router.push(ficheHref(a));
          }}
        >
          <PosterArt activity={a} big />
          <div aria-hidden className="absolute inset-0" style={{ background: HERO_VEIL }} />

          <button
            type="button"
            aria-label="Plus d'options"
            aria-expanded={menu}
            onClick={(e) => {
              e.stopPropagation();
              setMenu((m) => !m);
            }}
            className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/10 text-white text-[20px] leading-none grid place-items-center"
          >
            <span aria-hidden>…</span>
          </button>
          {menu && (
            <div className="absolute right-3 top-16 z-20 nc-row p-1.5 min-w-[220px] ring-1 ring-line2" onClick={(e) => e.stopPropagation()} role="menu">
              {[
                { id: 'PAS_LE_TEMPS' as const, label: 'Pas ce soir' },
                { id: 'DE_COTE' as const, label: 'Mettre de côté' },
                { id: 'REFUS_ENFANT' as const, label: 'Il ne veut pas' },
              ].map((o) => (
                <button key={o.id} type="button" role="menuitem" onClick={() => skip(o.id)} className="w-full text-left px-4 min-h-[44px] rounded-[12px] text-[15px] text-ink hover:bg-surface-sub">
                  {o.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative p-6 md:p-10 max-w-2xl">
            <p className="text-sage text-[12px] font-bold uppercase tracking-[0.16em]">
              Recommandé pour {firstName} · {ROLE_LABELS[a.role]}
            </p>
            <h1 className="font-display text-[34px] md:text-[48px] leading-[1.08] font-semibold text-white mt-2">{a.title}</h1>
            <p className="mt-2 text-[16px] md:text-[18px] leading-[1.5] text-white/80">{a.objective}</p>
            <p className="mt-3 inline-flex items-start gap-2 text-[15px] leading-[1.45] text-white">
              <Icon name="sparkle" className="w-4 h-4 mt-[3px] shrink-0 text-accent" />
              {pick.reason}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-white/70">
              <li>{Math.min(duration, Math.max(...a.durations))} min</li>
              <li>{a.materials.length ? a.materials.join(', ') : 'Rien à préparer'}</li>
              <li>Énergie : {a.parent_energy}</li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href={launchHref}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-full bg-accent text-accent-on font-bold text-[16px]"
              >
                <Icon name="play" className="w-[18px] h-[18px]" />
                Lancer
              </Link>
              <Link
                href={ficheHref(a)}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-full bg-white/15 text-white font-semibold text-[16px]"
              >
                Voir la fiche
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="nc-card">
          <p className="text-[17px] leading-[1.5] text-ink">
            {favourite ? (
              <>
                Rien de nouveau pour {place === 'voiture' ? 'ce trajet' : 'ce soir'}. Refaites{' '}
                <Link href={ficheHref(favourite)} className="font-semibold text-accent-ink underline">
                  “{favourite.title}”
                </Link>{' '}
                ?
              </>
            ) : (
              <>Rien de nouveau pour {place === 'voiture' ? 'ce trajet' : 'ce soir'}. Choisissez librement ci-dessous.</>
            )}
          </p>
        </div>
      )}

      {firstMoment && (
        <p className="mt-4 text-[16px] text-body max-w-2xl">« {fill(DEFAULT_OPENER, { duree: DURATION_WORDS[duration] })} »</p>
      )}

      {/* Ce soir : temps et lieu — règlent l'affiche et les liens de toutes les rangées */}
      <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
        <DurationPills value={duration} available={DURATIONS} onChange={chooseDuration} />
        <PillGroup label="Lieu" value={place} options={PLACE_CHOICES.map((p) => ({ value: p.id, label: p.label }))} onChange={setPlace} />
      </div>
      {place === 'voiture' && (
        <p className="mt-2 text-[14px] text-soft">À lire avant de partir. Pendant la route, tout se fait à voix haute.</p>
      )}

      {evening.refusals >= 2 && (
        <Link href={`${P3_BASE}/quand-il-dit-non`} className="nc-row flex items-center justify-between gap-3 p-4 mt-4 min-h-[56px] max-w-2xl">
          <span className="text-[15px] font-semibold text-ink">{PAGE_NON.title}</span>
          <Icon name="chevron-right" className="w-5 h-5 text-soft" />
        </Link>
      )}

      {/* Raccourcis — la liberté totale à un tap */}
      <nav {...shortcuts.props} aria-label="Parcourir" className="mt-6 flex gap-2 overflow-x-auto scrollbar-hide overscroll-x-contain -mx-5 px-5 md:mx-0 md:px-0">
        <Link href={`${P3_BASE}/toutes`} className="nc-pill min-h-[44px] shrink-0 inline-flex items-center gap-1.5 !bg-accent !border-accent !text-accent-on font-semibold">
          <Icon name="grid" className="w-4 h-4" />
          Toutes les activités · {all.length}
        </Link>
        <Link href={`${P3_BASE}/programme`} className="nc-pill min-h-[44px] shrink-0 inline-flex items-center">
          Le programme
        </Link>
        <Link href={`${P3_BASE}/carnet`} className="nc-pill min-h-[44px] shrink-0 inline-flex items-center">
          Le carnet
        </Link>
        <Link href={`${P3_BASE}/quand-il-dit-non`} className="nc-pill min-h-[44px] shrink-0 inline-flex items-center">
          {PAGE_NON.title}
        </Link>
      </nav>

      {/* Progression — le compteur cumulatif d'abord, jamais de « 0 » */}
      <section className="mt-7 max-w-md">
        {data.countPhrase && <p className="font-display text-[26px] font-semibold text-ink leading-[1.15]">{data.countPhrase}</p>}
        <div className="mt-2 flex items-center gap-3">
          <div className="nc-track flex-1">
            <div className="nc-fill bg-accent" style={{ width: `${(data.week.done / 3) * 100}%` }} />
          </div>
          {/* R3 : jamais de « 0 » — tant que rien n'est fait, l'objectif est dit comme une invitation. */}
          <span className="text-[13px] text-soft shrink-0">
            {data.week.done > 0 ? `${data.week.done} sur 3 cette semaine` : 'Trois moments cette semaine'}
          </span>
        </div>
        {data.weeklyStreak !== null && (
          <p className="mt-2 text-[14px] text-soft">{data.weeklyStreak} semaines complètes d&apos;affilée</p>
        )}
      </section>

      {/* Les rangées */}
      {shelves.map((s) => (
        <PosterRow
          key={s.id}
          id={s.id}
          title={s.title}
          subtitle={s.subtitle}
          items={s.items}
          hrefOf={ficheHref}
          isDone={isDone}
          more={s.id === 'semaine' ? { href: `${P3_BASE}/programme`, label: 'Le programme' } : s.id.startsWith('phase-') ? undefined : { href: `${P3_BASE}/toutes`, label: 'Tout voir' }}
        />
      ))}

      <Link
        href={`${P3_BASE}/toutes`}
        className="mt-10 flex items-center justify-center gap-2 h-[56px] rounded-full border border-line2 text-[16px] font-semibold text-ink max-w-md"
      >
        <Icon name="grid" className="w-5 h-5" />
        Voir les {all.length} activités, triées par âge
      </Link>

      <div className="max-w-2xl">
        <Bilan4Semaines ctx={ctx} />
      </div>

      {/* Carnet — les 3 derniers moments */}
      {data.carnet.length > 0 && (
        <section className="mt-10 max-w-3xl">
          <h2 className="font-display text-[20px] md:text-[22px] font-semibold text-ink mb-3">Le carnet</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {data.carnet.slice(0, 3).map((m) => (
              <li key={`${m.activity_id}-${m.created_at}`} className="nc-row p-4">
                <p className="text-[12px] text-faint">{formatLongDate(m.created_at)}</p>
                <p className="mt-1 text-[15px] font-semibold text-ink">{getActivity(m.activity_id)?.title}</p>
                <p className="mt-1.5 text-[14px] leading-[1.45] text-body line-clamp-3">
                  {m.kept_phrase ? `« ${m.kept_phrase} »` : captureText(m.capture)}
                </p>
              </li>
            ))}
          </ul>
          <Link href={`${P3_BASE}/carnet`} className="inline-flex items-center gap-1.5 mt-3 min-h-[44px] font-semibold text-accent-ink">
            Tout le carnet <Icon name="arrow-right" className="w-4 h-4" />
          </Link>
        </section>
      )}

      <footer className="mt-12 pt-6 border-t border-line flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
        <Link href={`${P3_BASE}/sources`} className="min-h-[44px] inline-flex items-center text-soft hover:text-ink">
          Les sources de la méthode
        </Link>
        {/* Les séances vidéo Fitness restent accessibles quand leur flag est ouvert. */}
        {fitnessEnabled && (
          <Link href="/parent/fitness/seances" className="min-h-[44px] inline-flex items-center text-soft hover:text-ink">
            Les séances vidéo
          </Link>
        )}
        {/* « Quand consulter » : contenu à valider — lié en développement seulement. */}
        {IS_DEV && (
          <Link href={`${P3_BASE}/quand-consulter`} className="min-h-[44px] inline-flex items-center text-soft hover:text-ink">
            {PAGE_CONSULTER.title}
          </Link>
        )}
      </footer>
    </div>
  );
}

function Welcome({ ctx }: { ctx: P3Ctx }) {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => setSeen(readFlag('thrive.p3.welcomeSeen')), []);
  if (seen === null) return null;
  if (!seen)
    return (
      <Onboarding
        firstName={ctx.firstName}
        onDone={() => {
          writeFlag('thrive.p3.welcomeSeen');
          setSeen(true);
        }}
      />
    );
  return <Home ctx={ctx} />;
}

export default function MaisonPage() {
  return <P3Frame>{(ctx) => <Welcome ctx={ctx} />}</P3Frame>;
}
