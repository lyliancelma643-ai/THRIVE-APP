'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E1 — Accueil « Maison » (programme P3), à la place de l'ancien onglet Fitness. Le parent fatigué de 19 h 15 lance un
// moment en 2 taps sans rien choisir : la carte du soir (pickTonight) + « Lancer ».
// E10 — Onboarding au premier accès (clé localStorage thrive.p3.welcomeSeen).
//
// Anti-culpabilité (R3) : le compteur cumulatif est l'indicateur principal ;
// une série n'apparaît que si weeklyStreak() renvoie un nombre ; aucun « 0 »,
// aucun mot de manque. Tout texte de fiche vient du JSON généré (R1).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import { useAccessStore } from '@/lib/access';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { DurationPills, PillGroup, PillarTag } from '@/components/parent/p3/pieces';
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

// ── E1 — Accueil ─────────────────────────────────────────────────────────────
function Home({ ctx }: { ctx: P3Ctx }) {
  const router = useRouter();
  const { data, firstName, child } = ctx;
  const fitnessEnabled = useAccessStore((st) => st.access?.fitnessEnabled === true);
  const [duration, setDuration] = useState<Duration>(10);
  const [place, setPlace] = useState<PlaceChoice>('maison');
  const [evening, setEvening] = useState(() => ({ day: '', excluded: [] as string[], refusals: 0 }));
  const [menu, setMenu] = useState(false);
  const [weekDone, setWeekDone] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
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

  const pool = useMemo(
    () => p3Pool().filter((a) => !evening.excluded.includes(a.id) && !data.saved.deCote.has(a.id)),
    [evening.excluded, data.saved.deCote]
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

  const week = getWeek(data.openWeek)!;
  const firstMoment = data.count === 0;
  const a = pick?.activity ?? null;

  const favourite = useMemo(() => {
    const five = data.moments.find((m) => m.rating === 5);
    return five ? getActivity(five.activity_id) : null;
  }, [data.moments]);

  const doneWeek = weekDone ? getWeek(weekDone) : null;
  const doneUnlock = doneWeek?.unlocks && data.rewards.has(doneWeek.unlocks as RewardId) ? doneWeek.unlocks : null;

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

  const launchHref = a ? `${P3_BASE}/${a.id}/moment?duree=${duration}&lieu=${place}` : '';

  return (
    <div className="max-w-2xl">
      <p className="nc-eyebrow">
        Semaine {data.openWeek} · {week.title}
      </p>

      {doneWeek && (
        <div className="nc-card ring-1 ring-accent-line mt-4 animate-om-up">
          <p className="font-display text-[20px] font-semibold text-ink">Semaine {doneWeek.week} complète.</p>
          {doneUnlock && (
            <Link href={`${P3_BASE}/objets/${doneUnlock}`} className="inline-flex items-center gap-1.5 mt-2 min-h-[44px] font-semibold text-accent-ink">
              {fill(REWARDS.find((r) => r.id === doneUnlock)!.label, { prenom: firstName })}
              <Icon name="arrow-right" className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {firstMoment && (
        <div className="mt-4">
          <p className="font-display text-[24px] leading-[1.25] text-ink">{getWeek(1)!.opening_line}</p>
          <p className="mt-2 text-[15px] leading-[1.6] text-body">{getWeek(1)!.intro[0]}</p>
          <p className="mt-3 text-[16px] text-ink">« {fill(DEFAULT_OPENER, { duree: DURATION_WORDS[duration] })} »</p>
        </div>
      )}

      {/* LA CARTE DU SOIR */}
      {a && pick ? (
        <div
          className="nc-card relative mt-5 md:p-7 min-h-[46vh] flex flex-col cursor-pointer animate-om-up"
          onClick={() => router.push(`${P3_BASE}/${a.id}?duree=${duration}&lieu=${place}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="nc-eyebrow">{ROLE_LABELS[a.role]}</p>
            <button
              type="button"
              aria-label="Plus d'options"
              aria-expanded={menu}
              onClick={(e) => {
                e.stopPropagation();
                setMenu((m) => !m);
              }}
              className="nc-iconbtn -mt-2 -mr-2 text-[20px] leading-none"
            >
              <span aria-hidden>…</span>
            </button>
          </div>
          {menu && (
            <div className="absolute right-4 top-16 z-10 nc-row p-1.5 min-w-[220px] ring-1 ring-line2" onClick={(e) => e.stopPropagation()} role="menu">
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
          <Link
            href={`${P3_BASE}/${a.id}?duree=${duration}&lieu=${place}`}
            onClick={(e) => e.stopPropagation()}
            className="font-display text-[34px] md:text-[42px] leading-[1.1] font-semibold text-ink mt-2 hover:underline"
          >
            {a.title}
          </Link>
          <p className="mt-2 text-[16px] leading-[1.5] text-body">{a.objective}</p>
          <p className="mt-3 text-[15px] text-soft">{pick.reason}</p>
          <div className="mt-3">
            <PillarTag pillar={a.pillar_main} />
          </div>
          <ul className="mt-auto pt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-soft">
            <li>{Math.min(duration, Math.max(...a.durations))} min</li>
            <li>{PLACE_CHOICES.find((p) => p.id === place)!.label}</li>
            <li>{a.materials.length ? a.materials.join(', ') : 'Rien à préparer'}</li>
            <li>Énergie : {a.parent_energy}</li>
          </ul>
          <Link
            href={launchHref}
            onClick={(e) => e.stopPropagation()}
            className="mt-5 inline-flex items-center justify-center gap-2 h-[56px] rounded-full bg-accent text-accent-on font-bold text-[17px]"
          >
            <Icon name="play" className="w-[18px] h-[18px]" />
            Lancer
          </Link>
        </div>
      ) : (
        <div className="nc-card mt-5">
          <p className="text-[17px] leading-[1.5] text-ink">
            {favourite ? (
              <>
                Rien de nouveau pour {place === 'voiture' ? 'ce trajet' : 'ce soir'}. Refaites{' '}
                <Link href={`${P3_BASE}/${favourite.id}?duree=${duration}&lieu=${place}`} className="font-semibold text-accent-ink underline">
                  “{favourite.title}”
                </Link>{' '}
                ?
              </>
            ) : (
              <>Rien de nouveau pour {place === 'voiture' ? 'ce trajet' : 'ce soir'}.</>
            )}
          </p>
          <Link href={`${P3_BASE}/programme`} className="inline-flex items-center gap-1.5 mt-3 min-h-[44px] font-semibold text-accent-ink">
            Voir le programme <Icon name="arrow-right" className="w-4 h-4" />
          </Link>
        </div>
      )}

      {place === 'voiture' && (
        <p className="mt-3 text-[14px] text-soft">À lire avant de partir. Pendant la route, tout se fait à voix haute.</p>
      )}

      {evening.refusals >= 2 && (
        <Link href={`${P3_BASE}/quand-il-dit-non`} className="nc-row flex items-center justify-between gap-3 p-4 mt-4 min-h-[56px]">
          <span className="text-[15px] font-semibold text-ink">{PAGE_NON.title}</span>
          <Icon name="chevron-right" className="w-5 h-5 text-soft" />
        </Link>
      )}

      {/* Temps disponible et lieu */}
      <div className="mt-6 space-y-3">
        <DurationPills value={duration} available={DURATIONS} onChange={chooseDuration} />
        <PillGroup label="Lieu" value={place} options={PLACE_CHOICES.map((p) => ({ value: p.id, label: p.label }))} onChange={setPlace} />
      </div>

      {/* Progression — le compteur cumulatif d'abord, jamais de « 0 » */}
      <section className="mt-9">
        {data.countPhrase && (
          <p className="font-display text-[30px] md:text-[36px] font-semibold text-ink leading-[1.15]">{data.countPhrase}</p>
        )}
        <p className="mt-2 text-[14px] text-soft">{data.week.done} sur 3 cette semaine</p>
        <div className="nc-track mt-2 max-w-sm">
          <div className="nc-fill bg-accent" style={{ width: `${(data.week.done / 3) * 100}%` }} />
        </div>
        {data.weeklyStreak !== null && (
          <p className="mt-2 text-[14px] text-soft">{data.weeklyStreak} semaines complètes d&apos;affilée</p>
        )}
      </section>

      <Link href={`${P3_BASE}/programme`} className="inline-flex items-center gap-1.5 mt-6 min-h-[44px] font-semibold text-accent-ink">
        Choisir autre chose <Icon name="arrow-right" className="w-4 h-4" />
      </Link>

      <Bilan4Semaines ctx={ctx} />

      {/* Carnet — les 3 derniers moments */}
      {data.carnet.length > 0 && (
        <section className="mt-9">
          <h2 className="nc-eyebrow mb-3">Le carnet</h2>
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
        <Link href={`${P3_BASE}/quand-il-dit-non`} className="min-h-[44px] inline-flex items-center text-soft hover:text-ink">
          {PAGE_NON.title}
        </Link>
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
