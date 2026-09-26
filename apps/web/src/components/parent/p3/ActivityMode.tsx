'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E4 — Mode activité (les 5 temps de la Méthode compressés) + E5 — synthèse.
//
//   1. Check-in (ressenti, jamais de chiffre — R5), une question à la fois
//   2. La fois d'avant
//   3. L'activité : amorce → le déroulé se construit SUR LA MÊME PAGE : chaque
//      « Suivant » ajoute en dessous la chose à faire ou la phrase à dire
//      (une question à la fois), JAMAIS automatiquement. Par étape : « Si ça
//      bloque », minuteur de jeu lancé par le parent, visuel à montrer.
//      Minuteur du moment en tête (part du temps choisi) ; « Approfondir »
//      l'anime et ajoute ses 10 minutes si elles n'étaient pas prévues.
//   4. Débrief : les questions s'ajoutent l'une sous l'autre, une à la fois
//   5. Pour finir : la phrase de clôture
//   → écran « 12 minutes avec Léa. » (1 s) → synthèse facultative → progression
//
// Plein écran : rendu dans un portail au-dessus de la barre d'onglets ; les
// gestes ne remontent pas jusqu'à la navigation au pouce du hub. Écran gardé
// allumé par la Wake Lock API quand elle existe (ignorée sinon).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';
import {
  REWARDS,
  activitiesOfWeek,
  getWeek,
  isWeekComplete,
  recallLine,
  renderCaptureLabel,
  resolveActivity,
  type Duration,
  type P3Activity,
  type RewardId,
  type VisualId,
} from '@/lib/p3-moments';
import {
  CHECKIN,
  CLOSING_SCREEN,
  DEBRIEF,
  PILLAR_PLAIN,
  PRIDE_LINES,
  SYNTHESIS,
} from '@/lib/p3-moments/guide';
import {
  P3_BASE,
  captureText as captureToText,
  fill,
  formatFullDate,
  inOneYear,
  type P3Capture,
  type P3Checkin,
  type P3Outcome,
} from '@/lib/p3-moments/app';
import type { P3Ctx } from './P3Frame';
import { InlineMd } from './InlineMd';
import { TimerRing } from './TimerRing';
import { pushWeekDone } from './session';
import { StepTimer } from './StepTimer';
import { VisualButton, VisualSheet } from './Visuals';

type Place = 'maison' | 'exterieur' | 'voiture';

type Screen =
  | { t: 'checkin' }
  | { t: 'rappel' }
  | { t: 'lecture' }
  | { t: 'amorce' }
  | { t: 'deroule' }
  | { t: 'route' }
  | { t: 'debrief' }
  | { t: 'cloture' }
  | { t: 'minutes' }
  | { t: 'synthese' }
  | { t: 'fin' };

const EXT_LABELS = { approfondir: 'Approfondir', ancrer: 'Ancrer', transferer: 'Transférer' } as const;

/** Ce qu'on travaille : rappel de l'objectif de développement lié à la séance. */
function WorkedOn({ activity, compact = false }: { activity: P3Activity; compact?: boolean }) {
  const week = getWeek(activity.week);
  return (
    <div className={`rounded-[22px] border-2 border-accent-line ${compact ? 'p-4' : 'p-5'}`}>
      <p className="nc-eyebrow">Ce qu’on travaille</p>
      <p className={`mt-1.5 font-display font-semibold text-ink ${compact ? 'text-[20px]' : 'text-[24px]'} leading-[1.2]`}>
        {week?.skill ?? activity.subtitle}
      </p>
      <p className="mt-2 text-[15px] leading-[1.5] text-body">{activity.objective}</p>
      <p className="mt-2 text-[13px] text-soft">
        {activity.subtitle} · {PILLAR_PLAIN[activity.pillar_main]}
      </p>
    </div>
  );
}

/** Garde l'écran allumé pendant le moment (Wake Lock API), silencieusement ignoré sinon. */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
    let lock: Sentinel | null = null;
    const acquire = async () => {
      try {
        lock = (await nav.wakeLock?.request('screen')) ?? null;
      } catch {
        lock = null;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, []);
}

function BigText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-display text-[30px] md:text-[40px] leading-[1.22] text-ink text-balance ${className}`}>
      {children}
    </p>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full md:w-auto md:min-w-[260px] h-[56px] px-8 rounded-full bg-accent text-accent-on font-bold text-[17px] active:scale-[0.98] transition-transform motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[48px] px-4 text-[15px] font-semibold text-soft hover:text-ink">
      {children}
    </button>
  );
}

export function ActivityMode({
  ctx,
  activity,
  duration: declared,
  place,
}: {
  ctx: P3Ctx;
  activity: P3Activity;
  duration: Duration;
  place: Place;
}) {
  const router = useRouter();
  const { data, firstName, band } = ctx;
  const r = useMemo(() => resolveActivity(activity, declared, band)!, [activity, declared, band]);
  const week = getWeek(activity.week);
  const isLetter = activity.capture?.kind === 'lettre';
  const inCar = place === 'voiture';

  const recall = recallLine(firstName, data.lastKeptPhrase);
  // La phrase d'ouverture de la semaine ne s'affiche qu'avant sa première fiche cœur.
  const opening = activity.programme === 'coeur' && activity.rank === 1 && week ? week.opening_line : null;

  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>({ t: 'checkin' });
  const [checkin, setCheckin] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureItems, setCaptureItems] = useState<string[]>(['', '', '']);
  const [captureText, setCaptureText] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerOpen, setAnswerOpen] = useState<Record<number, boolean>>({});
  /** Déroulé : nombre de « temps » (faire / dire) déjà affichés, toutes étapes confondues. */
  const [revealed, setRevealed] = useState(1);
  /** Extensions ouvertes (index dans activity.extensions). */
  const [extOpen, setExtOpen] = useState<number[]>([]);
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [boost, setBoost] = useState(0);
  const [debriefShown, setDebriefShown] = useState(1);
  const [visual, setVisual] = useState<VisualId | null>(null);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [outcome, setOutcome] = useState<P3Outcome | null>(null);
  const [kept, setKept] = useState('');
  const [quitAsk, setQuitAsk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ newRewards: RewardId[]; before: number; answered: boolean; skipped: boolean } | null>(null);
  const [shownCount, setShownCount] = useState<number | null>(null);
  const [unlockDismissed, setUnlockDismissed] = useState(false);
  // Lettre (ACT-1302)
  const [letter, setLetter] = useState('');
  const [letterStep, setLetterStep] = useState<'write' | 'confirm' | 'sealed' | 'paper'>('write');
  const [sealedAt, setSealedAt] = useState<Date | null>(null);
  const lastRef = useRef<HTMLElement | null>(null);
  const setLast = useCallback((el: HTMLElement | null) => {
    if (el) lastRef.current = el;
  }, []);

  useWakeLock();
  useEffect(() => setMounted(true), []);

  // Tic d'une seconde, seulement pendant le temps 3.
  useEffect(() => {
    if (!startedAt || endedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  // Chaque changement d'écran remonte en haut.
  useEffect(() => {
    document.getElementById('p3-mode')?.scrollTo({ top: 0 });
  }, [screen.t]);

  // Ce qui vient d'apparaître en dessous glisse sous les yeux du parent.
  useEffect(() => {
    if (screen.t !== 'deroule' && screen.t !== 'debrief' && screen.t !== 'checkin') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => lastRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }), 60);
    return () => window.clearTimeout(id);
  }, [revealed, extOpen.length, debriefShown, checkin, screen.t]);

  // Fond de page figé derrière le mode activité.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const elapsed = startedAt ? Math.max(0, Math.round(((endedAt ?? now) - startedAt) / 1000)) : 0;
  // Le minuteur part du temps choisi par le parent ; « Approfondir » peut l'allonger.
  const playedDuration = Math.min(30, r.duration + extraMinutes) as Duration;
  const total = (r.duration + extraMinutes) * 60;

  // Déroulé à plat : chaque « temps » sait à quelle étape il appartient.
  const flat = useMemo(
    () => activity.guide.flatMap((g, step) => g.beats.map((beat, k) => ({ step, k, beat }))),
    [activity.guide]
  );
  const allRevealed = revealed >= flat.length;
  const visibleSteps = flat[Math.min(revealed, flat.length) - 1]?.step ?? 0;

  // Ce que l'enfant a noté dans ses mots (visuel « Ses outils »).
  const notes = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of data.carnet) {
      if (out[m.activity_id]) continue;
      const t = captureToText(m.capture) ?? m.kept_phrase?.trim();
      if (t) out[m.activity_id] = t;
    }
    return out;
  }, [data.carnet]);

  // ── Navigation entre écrans ───────────────────────────────────────────────
  const afterCheckin = () => {
    if (recall || opening) setScreen({ t: 'rappel' });
    else setScreen(inCar ? { t: 'lecture' } : { t: 'amorce' });
  };
  const afterRappel = () => setScreen(inCar ? { t: 'lecture' } : { t: 'amorce' });

  const startActivity = () => {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setRevealed(1);
    setScreen(inCar ? { t: 'route' } : { t: 'deroule' });
  };

  const finishActivity = useCallback(() => {
    setEndedAt((e) => e ?? Date.now());
    setCaptureOpen(false);
    setDebriefShown(1);
    setScreen({ t: 'debrief' });
  }, []);

  const nextBeat = () => setRevealed((n) => Math.min(flat.length, n + 1));
  const prevBeat = () => setRevealed((n) => Math.max(1, n - 1));
  const nextIsNewStep = !allRevealed && flat[revealed]?.step !== flat[revealed - 1]?.step;

  /** « Approfondir » : anime le minuteur ; ajoute 10 min si elles n'étaient pas prévues. */
  const openExtension = (i: number) => {
    if (extOpen.includes(i)) return;
    const ext = activity.extensions[i];
    setExtOpen((o) => [...o, i]);
    setBoost((b) => b + 1);
    if (ext.adds_to > r.duration) setExtraMinutes((m) => Math.min(30 - r.duration, m + 10));
  };

  const nextDebrief = () => {
    if (debriefShown < r.debrief.length) setDebriefShown((n) => n + 1);
    else setScreen({ t: 'cloture' });
  };

  // Écran « 12 minutes avec Léa. » seul pendant 1 s, puis la synthèse.
  useEffect(() => {
    if (screen.t !== 'minutes') return;
    const id = window.setTimeout(() => setScreen({ t: 'synthese' }), 1000);
    return () => window.clearTimeout(id);
  }, [screen]);

  // ── Sortie anticipée ──────────────────────────────────────────────────────
  const leave = () => {
    if (!startedAt || screen.t === 'fin') {
      router.push(screen.t === 'fin' ? P3_BASE : `${P3_BASE}/${activity.id}?duree=${r.duration}&lieu=${place}`);
      return;
    }
    if (screen.t === 'synthese' || screen.t === 'minutes') {
      save(true);
      return;
    }
    setQuitAsk(true);
  };

  // ── Enregistrement (E5) ───────────────────────────────────────────────────
  const buildCapture = (): P3Capture | null => {
    if (!activity.capture || isLetter) return null; // le corps d'une lettre ne quitte jamais p3_letters
    const items = captureItems.map((s) => s.trim()).filter(Boolean);
    if (activity.capture.kind === 'forces') return items.length ? { kind: 'forces', items } : null;
    return captureText.trim() ? { kind: activity.capture.kind, text: captureText.trim() } : null;
  };

  const save = async (skipped: boolean) => {
    if (saving || result) return;
    setSaving(true);
    const before = data.count;
    const checkinRow: P3Checkin | null = Object.keys(checkin).length ? (checkin as P3Checkin) : null;
    const debriefRows = r.debrief
      .map((d, i) => ({ kind: d.kind, answer: (answers[i] ?? '').trim() }))
      .filter((d) => d.answer);
    const { newRewards } = await data.recordMoment({
      activityId: activity.id,
      week: activity.week,
      duration_chosen: playedDuration,
      duration_real_s: startedAt ? Math.round(((endedAt ?? Date.now()) - startedAt) / 1000) : null,
      place,
      checkin: checkinRow,
      debrief: debriefRows.length ? debriefRows : null,
      capture: buildCapture(),
      kept_phrase: skipped ? null : kept.trim() || null,
      rating: skipped ? null : rating,
      outcome: skipped ? null : outcome,
    });
    const answered = !skipped && (rating !== null || outcome !== null || kept.trim() !== '');
    setResult({ newRewards, before, answered, skipped });
    setSaving(false);
    setScreen({ t: 'fin' });
  };

  const weekJustDone = useMemo(
    // Seule une fiche cœur peut compléter une semaine : un complément ou un bonus ne la « refinit » pas.
    () =>
      result && activity.programme === 'coeur' && activity.week !== null
        ? isWeekComplete(activity.week, data.doneIds)
        : false,
    [result, activity.programme, activity.week, data.doneIds]
  );
  useEffect(() => {
    if (result && weekJustDone && activity.week !== null) pushWeekDone(ctx.child.id, activity.week);
  }, [result, weekJustDone, ctx.child.id, activity.week]);

  // Compteur qui monte (≤ 2 s) si le parent a répondu ; sinon affiché directement.
  useEffect(() => {
    if (!result) return;
    const target = data.count;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!result.answered || reduce || target <= result.before) {
      setShownCount(target);
      return;
    }
    let n = result.before;
    setShownCount(n);
    const step = Math.max(1, Math.floor(1800 / Math.max(1, target - n)));
    const id = window.setInterval(() => {
      n += 1;
      setShownCount(n);
      if (n >= target) window.clearInterval(id);
    }, Math.min(step, 600));
    return () => window.clearInterval(id);
  }, [result, data.count]);

  // ── Écrans ────────────────────────────────────────────────────────────────
  const captureLabel = activity.capture
    ? isLetter
      ? renderCaptureLabel(activity.capture.label, new Date())
      : activity.capture.label
    : null;

  const noteButton = activity.capture && (
    <button
      type="button"
      onClick={() => setCaptureOpen(true)}
      className="nc-pill min-h-[44px] inline-flex gap-1.5"
    >
      <Icon name="plus" className="w-4 h-4" /> {isLetter ? 'La lettre' : 'Noter'}
    </button>
  );

  const doneTitle = (() => {
    if (activity.week === null) return null;
    const next = activitiesOfWeek(activity.week).find((a) => !data.doneIds.has(a.id));
    return next ?? null;
  })();

  const displayableRewards = (result?.newRewards ?? []).filter((id) => REWARDS.find((x) => x.id === id)?.available);

  let body: React.ReactNode = null;
  switch (screen.t) {
    case 'checkin':
      body = (
        <>
          <p className="nc-eyebrow">Check-in</p>
          <p className="mt-3 text-[17px] leading-[1.55] text-body">{CHECKIN.intro}</p>
          <div className="mt-6 space-y-6">
            {CHECKIN.axes.slice(0, Math.min(CHECKIN.axes.length, Object.keys(checkin).length + 1)).map((axis, i, shown) => (
              <fieldset key={axis.id} ref={i === shown.length - 1 ? setLast : undefined} className="motion-safe:animate-om-up">
                <legend className="text-[18px] text-ink mb-3">{axis.question}</legend>
                <div className="flex flex-wrap gap-2">
                  {axis.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-pressed={checkin[axis.id] === o.id}
                      onClick={() => setCheckin((c) => ({ ...c, [axis.id]: o.id }))}
                      className="nc-pill min-h-[52px] gap-2 text-[15px]"
                    >
                      <span aria-hidden className="text-[22px]">{o.emoji}</span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            {Object.keys(checkin).length >= CHECKIN.axes.length && <PrimaryButton onClick={afterCheckin}>Continuer</PrimaryButton>}
            <GhostButton onClick={afterCheckin}>{CHECKIN.skip}</GhostButton>
          </div>
        </>
      );
      break;

    case 'rappel':
      body = (
        <>
          {opening && (
            <>
              <p className="nc-eyebrow">Semaine {week?.week} · {week?.title}</p>
              <BigText className="mt-4">{opening}</BigText>
            </>
          )}
          {recall && (
            <>
              <p className={`nc-eyebrow ${opening ? 'mt-10' : ''}`}>La fois d’avant</p>
              <BigText className="mt-4">{recall}</BigText>
            </>
          )}
          <div className="mt-10">
            <PrimaryButton onClick={afterRappel}>Continuer</PrimaryButton>
          </div>
        </>
      );
      break;

    case 'lecture':
      body = (
        <>
          <p className="nc-eyebrow">En voiture</p>
          <p className="mt-3 text-[20px] leading-[1.45] text-ink">
            Lisez les étapes maintenant. Pendant la route, posez le téléphone : tout se fait à voix haute.
          </p>
          <div className="nc-card mt-6">
            <p className="text-[15px] text-soft mb-2">Dites :</p>
            <p className="font-display text-[22px] leading-[1.3] text-ink">{r.opener}</p>
          </div>
          <ol className="mt-5 space-y-3">
            {r.screen_steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[18px] leading-[1.45] text-body">
                <span className="font-display font-semibold text-accent-ink w-6 shrink-0">{i + 1}</span>
                <span>
                  <InlineMd text={s} />
                  {activity.guide[i].beats
                    .filter((b) => b.kind === 'dire')
                    .map((b, k) => (
                      <span key={k} className="block mt-1 text-[16px] text-ink">
                        Dites : {b.text}
                      </span>
                    ))}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <PrimaryButton onClick={() => setScreen({ t: 'amorce' })}>C’est lu</PrimaryButton>
          </div>
        </>
      );
      break;

    case 'amorce':
      body = (
        <>
          <WorkedOn activity={activity} compact />
          {activity.safety && (
            <details className="mt-4 nc-row p-4">
              <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink min-h-[28px]">
                À savoir avant de commencer
              </summary>
              <p className="mt-2 text-[15px] leading-[1.55] text-body">
                <InlineMd text={activity.safety} />
              </p>
            </details>
          )}
          <p className="mt-8 text-[18px] text-soft">Pour commencer, dites :</p>
          <BigText className="mt-3 !text-[34px] md:!text-[46px]">{r.opener}</BigText>
          <p className="mt-6 text-[15px] leading-[1.5] text-soft">
            Le minuteur démarre sur {r.duration} minutes. Ensuite, touchez « Suivant » : chaque consigne s’ajoute en dessous, une à la fois.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={startActivity}>C’est dit, on commence</PrimaryButton>
          </div>
        </>
      );
      break;

    case 'route':
      // Le parent conducteur n'a jamais à regarder l'écran pour avancer.
      body = (
        <div className="flex flex-col items-center text-center pt-6">
          <TimerRing elapsed={elapsed} total={total} size={200} />
          <p className="mt-6 text-[17px] text-soft max-w-sm">Tout se fait à voix haute. Le téléphone peut rester posé.</p>
          <div className="mt-10">
            <PrimaryButton onClick={finishActivity}>Terminer</PrimaryButton>
          </div>
        </div>
      );
      break;

    case 'deroule': {
      body = (
        <div className="pb-28">
          {activity.guide.slice(0, visibleSteps + 1).map((g, stepIdx) => {
            const current = stepIdx === visibleSteps && !(allRevealed && extOpen.length);
            const beats = flat.filter((f) => f.step === stepIdx).slice(0, Math.max(0, revealed - flat.findIndex((f) => f.step === stepIdx)));
            return (
              <section
                key={stepIdx}
                className={`${stepIdx > 0 ? 'mt-10 pt-8 border-t border-line' : ''} motion-safe:animate-om-up transition-opacity motion-reduce:transition-none ${current ? '' : 'opacity-60'}`}
              >
                <p className="nc-eyebrow">
                  Étape {stepIdx + 1} sur {activity.guide.length}
                </p>
                <p className="mt-2 font-display text-[26px] md:text-[32px] leading-[1.2] text-ink text-balance">
                  <InlineMd text={r.screen_steps[stepIdx]} />
                </p>
                <div className="mt-4 space-y-3">
                  {beats.map(({ beat, k }) => {
                    const isLast = flat.findIndex((f) => f.step === stepIdx) + k === revealed - 1;
                    return (
                      <div key={k} ref={isLast ? setLast : undefined} className="motion-safe:animate-om-up">
                        {beat.kind === 'dire' ? (
                          <div className={`rounded-[20px] p-4 ${isLast && current ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] ring-2 ring-accent' : 'bg-surface-sub'}`}>
                            <p className="text-[13px] font-bold uppercase tracking-wide text-accent-ink">Dites</p>
                            <p className="mt-1 font-display text-[22px] md:text-[26px] leading-[1.3] text-ink">{beat.text}</p>
                          </div>
                        ) : (
                          <div className="flex gap-3 px-1">
                            <span aria-hidden className="mt-0.5 text-[18px]">👉</span>
                            <p className={`text-[17px] leading-[1.55] ${isLast && current ? 'text-ink font-semibold' : 'text-body'}`}>
                              <InlineMd text={beat.text} />
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {g.visual && <VisualButton id={g.visual} onOpen={setVisual} />}
                {g.timer && <StepTimer timer={g.timer} />}
                {g.help && (
                  <details className="mt-4 nc-row p-4 group">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-[15px] font-semibold text-ink min-h-[28px]">
                      Si ça bloque
                      <Icon name="chevron-down" className="w-4 h-4 text-soft transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-2 text-[15px] leading-[1.55] text-body">
                      <InlineMd text={g.help} />
                    </p>
                  </details>
                )}
              </section>
            );
          })}

          {/* Approfondir : un bouton par palier de 10 min ; le minuteur s'anime */}
          {allRevealed && activity.extensions.length > 0 && (
            <div className="mt-10 pt-8 border-t border-line space-y-4">
              <p className="nc-eyebrow">Vous avez encore envie ?</p>
              {activity.extensions.map((ext, i) => {
                const open = extOpen.includes(i);
                const planned = ext.adds_to <= r.duration;
                if (i > 0 && !extOpen.includes(i - 1)) return null;
                return open ? (
                  <div key={i} ref={i === extOpen[extOpen.length - 1] ? setLast : undefined} className="nc-card ring-1 ring-accent-line motion-safe:animate-om-up">
                    <p className="nc-eyebrow">+10 min — {EXT_LABELS[ext.kind]}</p>
                    <p className="mt-2 text-[17px] leading-[1.55] text-ink whitespace-pre-line">
                      <InlineMd text={ext.text} />
                    </p>
                  </div>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openExtension(i)}
                    className="w-full flex items-center gap-3 rounded-[22px] border-2 border-accent p-4 text-left active:scale-[0.99] transition-transform motion-reduce:transition-none"
                  >
                    <span className="w-11 h-11 rounded-full bg-accent text-accent-on grid place-items-center font-bold shrink-0" aria-hidden>
                      +10
                    </span>
                    <span className="flex-1">
                      <span className="block text-[18px] font-bold text-ink">{EXT_LABELS[ext.kind]}</span>
                      <span className="block text-[14px] text-soft">
                        {planned ? 'Prévu dans votre temps choisi' : 'Ajoute 10 minutes au minuteur'}
                      </span>
                    </span>
                    <Icon name="chevron-right" className="w-5 h-5 text-soft" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Barre d'action collée en bas : toujours au pouce */}
          <div className="fixed inset-x-0 bottom-0 z-[75] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur border-t border-line safe-bottom">
            <div className="max-w-2xl mx-auto px-5 md:px-8 py-3 flex items-center gap-2">
              {revealed > 1 && (
                <button type="button" onClick={prevBeat} className="nc-iconbtn shrink-0" aria-label="Revenir d’un cran">
                  <Icon name="chevron-right" className="w-5 h-5 rotate-180" />
                </button>
              )}
              {noteButton}
              <div className="flex-1" />
              {allRevealed ? (
                <PrimaryButton onClick={finishActivity}>Terminer l’activité</PrimaryButton>
              ) : (
                <>
                  <button type="button" onClick={finishActivity} className="min-h-[48px] px-2 text-[14px] font-semibold text-soft hover:text-ink shrink-0">
                    Terminer
                  </button>
                  <button
                    type="button"
                    onClick={nextBeat}
                    className="shrink-0 h-[52px] px-5 rounded-full bg-accent text-accent-on font-bold text-[16px] inline-flex items-center gap-1.5 active:scale-[0.98] transition-transform motion-reduce:transition-none"
                  >
                    {nextIsNewStep ? 'Étape suivante' : 'Suivant'}
                    <Icon name="chevron-right" className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
      break;
    }

    case 'debrief': {
      body = (
        <>
          <p className="text-[15px] leading-[1.55] text-soft mb-6">{DEBRIEF.intro}</p>
          <div className="space-y-8">
            {r.debrief.slice(0, debriefShown).map((q, i) => {
              const current = i === debriefShown - 1;
              return (
                <div
                  key={i}
                  ref={current ? setLast : undefined}
                  className={`motion-safe:animate-om-up transition-opacity motion-reduce:transition-none ${current ? '' : 'opacity-60'}`}
                >
                  <p className="nc-eyebrow">
                    Question {i + 1} sur {r.debrief.length} · {DEBRIEF.labels[q.kind]}
                  </p>
                  <p className={`mt-3 font-display leading-[1.25] text-ink text-balance ${current ? 'text-[28px] md:text-[36px]' : 'text-[20px]'}`}>
                    {q.question}
                  </p>
                  {answerOpen[i] || answers[i] ? (
                    <textarea
                      value={answers[i] ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                      rows={2}
                      maxLength={500}
                      autoFocus={current}
                      aria-label="Sa réponse"
                      className="mt-4 w-full rounded-[18px] bg-field border border-line2 p-4 text-[16px] text-ink placeholder:text-faint"
                      placeholder="Sa réponse, dans ses mots"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnswerOpen((o) => ({ ...o, [i]: true }))}
                      className="mt-3 min-h-[44px] text-[15px] font-semibold text-accent-ink underline underline-offset-4"
                    >
                      Noter sa réponse
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {debriefShown === r.debrief.length && activity.week === 1 && (
            <p className="mt-6 text-[14px] leading-[1.5] text-soft">{DEBRIEF.week1Note}</p>
          )}
          {activity.visuals.length > 0 && (
            <div className="mt-6">
              {activity.visuals.map((v) => (
                <VisualButton key={v} id={v} onOpen={setVisual} />
              ))}
            </div>
          )}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <PrimaryButton onClick={nextDebrief}>{debriefShown < r.debrief.length ? 'Question suivante' : 'Continuer'}</PrimaryButton>
            <GhostButton onClick={nextDebrief}>Passer</GhostButton>
          </div>
        </>
      );
      break;
    }

    case 'cloture':
      body = (
        <>
          <p className="text-[18px] text-soft">Pour finir, dites :</p>
          <BigText className="mt-3 !text-[34px] md:!text-[46px]">{r.closing}</BigText>
          <div className="mt-10">
            <PrimaryButton onClick={() => setScreen({ t: 'minutes' })}>C’est dit</PrimaryButton>
          </div>
        </>
      );
      break;

    case 'minutes':
      body = (
        <div className="min-h-[60dvh] grid place-items-center text-center">
          <BigText>
            {fill(CLOSING_SCREEN, { minutes: Math.max(1, Math.round(elapsed / 60)), prenom: firstName })}
          </BigText>
        </div>
      );
      break;

    case 'synthese':
      body = (
        <>
          <p className="nc-eyebrow">{SYNTHESIS.rating}</p>
          <div className="mt-3 flex gap-1" role="group" aria-label={SYNTHESIS.rating}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rating === n}
                aria-label={`${n} sur 5`}
                onClick={() => setRating(rating === n ? null : n)}
                className="w-12 h-12 grid place-items-center rounded-full"
              >
                <Icon
                  name="star"
                  className={`w-8 h-8 ${rating !== null && n <= rating ? 'text-accent-ink' : 'text-faint'}`}
                  strokeWidth={rating !== null && n <= rating ? 2.6 : 1.6}
                />
              </button>
            ))}
          </div>

          <p className="nc-eyebrow mt-8">{SYNTHESIS.outcome.question}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SYNTHESIS.outcome.options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={outcome === o.id}
                onClick={() => setOutcome(outcome === o.id ? null : (o.id as P3Outcome))}
                className="nc-pill min-h-[48px]"
              >
                {o.label}
              </button>
            ))}
          </div>

          <label className="nc-eyebrow mt-8 block" htmlFor="p3-kept">
            {SYNTHESIS.kept}
          </label>
          <textarea
            id="p3-kept"
            value={kept}
            onChange={(e) => setKept(e.target.value)}
            rows={2}
            maxLength={500}
            className="mt-3 w-full rounded-[18px] bg-field border border-line2 p-4 text-[16px] text-ink"
          />

          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <PrimaryButton onClick={() => save(false)}>{saving ? '…' : 'Garder ce moment'}</PrimaryButton>
            <GhostButton onClick={() => save(true)}>{SYNTHESIS.skip}</GhostButton>
          </div>
        </>
      );
      break;

    case 'fin': {
      const low = !result?.skipped && rating !== null && rating <= 2;
      body = (
        <>
          <p
            className={`font-display text-[34px] md:text-[44px] leading-[1.15] font-semibold text-ink ${result?.answered ? 'animate-om-up' : ''}`}
            aria-live="polite"
          >
            {shownCount !== null ? (shownCount === 1 ? `1 moment avec ${firstName}` : `${shownCount} moments avec ${firstName}`) : data.countPhrase}
          </p>
          <div className="mt-4 flex items-center gap-2" aria-label={`${data.week.done} sur 3 cette semaine`}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-colors duration-700 motion-reduce:transition-none ${i < data.week.done ? 'bg-accent' : 'bg-track'}`}
              />
            ))}
            <span className="ml-2 text-[14px] text-soft">{data.week.done} sur 3 cette semaine</span>
          </div>

          {low ? (
            <div className="nc-card mt-8">
              <p className="nc-eyebrow">{SYNTHESIS.lowRatingTitle}</p>
              <p className="mt-2 text-[16px] leading-[1.55] text-body">{activity.why_it_fails}</p>
              <p className="mt-4 text-[16px] text-ink">{PRIDE_LINES.notReally}</p>
            </div>
          ) : (
            <p className="mt-8 text-[18px] leading-[1.5] text-body">{PRIDE_LINES.done}</p>
          )}

          {isLetter && sealedAt && (
            <p className="mt-6 text-[15px] text-soft">
              Lettre scellée. Elle vous reviendra par courriel le {formatFullDate(inOneYear(sealedAt))}.
            </p>
          )}

          {/* E7 — déblocage : une carte qui apparaît (≤ 1,5 s), sans animation si reduced-motion */}
          {displayableRewards.length > 0 && !unlockDismissed && (
            <div className="mt-8 space-y-3">
              {displayableRewards.map((id) => {
                const rw = REWARDS.find((x) => x.id === id)!;
                return (
                  <div key={id} className="nc-card ring-1 ring-accent-line motion-safe:animate-om-up">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full bg-accent text-accent-on grid place-items-center shrink-0">
                        <Icon name="award" className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="nc-eyebrow">Débloqué</p>
                        <p className="font-display text-[20px] font-semibold text-ink">{fill(rw.label, { prenom: firstName })}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`${P3_BASE}/objets/${id}`}
                        className="inline-flex items-center h-11 px-5 rounded-full bg-accent text-accent-on font-bold text-[15px]"
                      >
                        Voir
                      </Link>
                      <GhostButton onClick={() => setUnlockDismissed(true)}>Plus tard</GhostButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-10">
            {weekJustDone ? (
              <p className="text-[16px] text-ink mb-4">Semaine {activity.week} complète.</p>
            ) : null}
            {doneTitle ? (
              <Link
                href={`${P3_BASE}/${doneTitle.id}`}
                className="nc-row flex items-center justify-between gap-3 p-4 min-h-[56px]"
              >
                <span className="text-[15px] text-body">
                  La suite : <span className="font-semibold text-ink">{doneTitle.title}</span>
                </span>
                <Icon name="chevron-right" className="w-5 h-5 text-soft" />
              </Link>
            ) : null}
            <div className="mt-4">
              <Link
                href={P3_BASE}
                className="inline-flex items-center justify-center h-[52px] px-8 rounded-full border border-line2 text-[16px] font-semibold text-ink"
              >
                Retour à Maison
              </Link>
            </div>
          </div>
        </>
      );
      break;
    }
  }

  // ── Panneau « + Noter » (et lettre scellée pour ACT-1302) ─────────────────
  const letterOpenDate = formatFullDate(inOneYear());
  const capturePanel = captureOpen && activity.capture && (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-[color-mix(in_srgb,var(--bg)_82%,transparent)]" role="dialog" aria-modal="true" aria-label={captureLabel ?? ''}>
      <div className="w-full md:max-w-lg bg-night-bg rounded-t-[28px] md:rounded-[28px] p-6 max-h-[90dvh] overflow-y-auto">
        <p className="nc-eyebrow">À garder</p>
        <p className="mt-2 text-[17px] text-ink">{captureLabel}</p>

        {isLetter ? (
          letterStep === 'write' ? (
            <>
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={10}
                maxLength={20000}
                autoFocus
                aria-label="La lettre"
                className="mt-4 w-full rounded-[18px] bg-field border border-line2 p-4 text-[16px] text-ink"
              />
              <div className="mt-5 flex gap-3 flex-wrap">
                <PrimaryButton onClick={() => letter.trim() && setLetterStep('confirm')}>Sceller la lettre</PrimaryButton>
                <GhostButton onClick={() => setCaptureOpen(false)}>Plus tard</GhostButton>
              </div>
            </>
          ) : letterStep === 'confirm' ? (
            <>
              <p className="mt-5 text-[17px] leading-[1.5] text-body">
                Une fois scellée, personne ne pourra la lire avant le {letterOpenDate}, pas même vous.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <PrimaryButton
                  onClick={async () => {
                    const res = await data.sealLetter('ENFANT', letter);
                    if (res.ok) {
                      setLetter(''); // effacé de la mémoire du composant (R12)
                      setSealedAt(res.sealedAt);
                      setLetterStep('sealed');
                    } else {
                      setLetterStep('paper');
                    }
                  }}
                >
                  Sceller
                </PrimaryButton>
                <GhostButton onClick={() => setLetterStep('write')}>Revenir</GhostButton>
              </div>
            </>
          ) : letterStep === 'sealed' ? (
            <>
              <p className="mt-5 text-[18px] leading-[1.5] text-ink">
                Lettre scellée. Elle vous reviendra par courriel le {sealedAt ? formatFullDate(inOneYear(sealedAt)) : letterOpenDate}.
              </p>
              <div className="mt-6">
                <PrimaryButton onClick={() => setCaptureOpen(false)}>Continuer</PrimaryButton>
              </div>
            </>
          ) : (
            <>
              <p className="mt-5 text-[16px] leading-[1.55] text-body">
                Pour ce soir, la lettre se garde sur papier : dans une enveloppe fermée, avec la date du {letterOpenDate} dessus.
              </p>
              <div className="mt-6">
                <PrimaryButton onClick={() => setCaptureOpen(false)}>Continuer</PrimaryButton>
              </div>
            </>
          )
        ) : (
          <>
            {activity.capture.kind === 'forces' ? (
              <div className="mt-4 space-y-2.5">
                {captureItems.map((v, i) => (
                  <input
                    key={i}
                    value={v}
                    onChange={(e) => setCaptureItems((it) => it.map((x, j) => (j === i ? e.target.value : x)))}
                    maxLength={140}
                    aria-label={`Force ${i + 1}`}
                    placeholder={`${i + 1}.`}
                    className="w-full h-12 rounded-[14px] bg-field border border-line2 px-4 text-[16px] text-ink"
                  />
                ))}
              </div>
            ) : (
              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                rows={4}
                maxLength={500}
                autoFocus
                aria-label={captureLabel ?? ''}
                className="mt-4 w-full rounded-[18px] bg-field border border-line2 p-4 text-[16px] text-ink"
              />
            )}
            <div className="mt-5">
              <PrimaryButton onClick={() => setCaptureOpen(false)}>C’est noté</PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const quitDialog = quitAsk && (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-[color-mix(in_srgb,var(--bg)_82%,transparent)]" role="dialog" aria-modal="true" aria-label="Enregistrer ce moment ?">
      <div className="w-full md:max-w-md bg-night-bg rounded-t-[28px] md:rounded-[28px] p-6">
        <p className="font-display text-[22px] text-ink">Enregistrer ce moment ?</p>
        <div className="mt-6 flex gap-3 flex-wrap">
          <PrimaryButton
            onClick={() => {
              setQuitAsk(false);
              setEndedAt((e) => e ?? Date.now());
              setCaptureOpen(false);
              setScreen({ t: 'minutes' });
            }}
          >
            Oui
          </PrimaryButton>
          <GhostButton onClick={() => router.push(P3_BASE)}>Non</GhostButton>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(
    <div
      id="p3-mode"
      className="fixed inset-0 z-[70] bg-night-bg text-night-body overflow-y-auto overscroll-contain"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      <div className="sticky top-0 z-[72] bg-[color-mix(in_srgb,var(--bg)_94%,transparent)] backdrop-blur safe-top">
        <div className="max-w-2xl mx-auto px-5 md:px-8 flex items-center justify-between gap-3 h-16">
          <button type="button" onClick={leave} className="nc-iconbtn shrink-0" aria-label={screen.t === 'fin' ? 'Fermer' : 'Quitter le mode activité'}>
            <Icon name="plus" className="w-5 h-5 rotate-45" />
          </button>
          <span className="text-[14px] text-soft truncate flex-1 text-center">{activity.title}</span>
          {startedAt && !endedAt && screen.t !== 'route' ? (
            <TimerRing elapsed={elapsed} total={total} size={40} compact boost={boost} />
          ) : (
            <span className="w-11" aria-hidden />
          )}
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-5 md:px-8 pb-10">
        <div key={screen.t} className="pt-4 motion-safe:animate-om-fade">
          {body}
        </div>
      </div>
      {visual && <VisualSheet id={visual} notes={notes} onClose={() => setVisual(null)} />}
      {capturePanel}
      {quitDialog}
    </div>,
    document.body
  );
}
