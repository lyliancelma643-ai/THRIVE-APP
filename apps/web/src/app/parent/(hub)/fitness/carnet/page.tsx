'use client';

// ─────────────────────────────────────────────────────────────────────────────
// E6 — Le carnet : fil antéchronologique des moments gardés (phrase, captures).
// Les objets débloqués s'insèrent comme des pages, à leur date. Aucune
// statistique, aucun graphique, aucun score ; pas de suppression en V1.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { P3Frame, type P3Ctx } from '@/components/parent/p3/P3Frame';
import { BackLink } from '@/components/parent/p3/pieces';
import { RewardView, rewardTitle } from '@/components/parent/p3/RewardView';
import { REWARDS, getActivity } from '@/lib/p3-moments';
import { vignetteSrc } from '@/components/parent/p3/vignettes';
import { P3_BASE, captureItems, formatLongDate, type P3MomentRow, type P3RewardRow } from '@/lib/p3-moments/app';

type Entry = { at: string; moment?: P3MomentRow; reward?: P3RewardRow };

function Carnet({ ctx }: { ctx: P3Ctx }) {
  const { data, firstName } = ctx;
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), []);

  const entries = useMemo<Entry[]>(() => {
    const visibleRewards = data.rewardRows.filter((r) => REWARDS.find((x) => x.id === r.reward_id)?.available);
    return [
      ...data.carnet.map((m) => ({ at: m.created_at, moment: m })),
      ...visibleRewards.map((r) => ({ at: r.earned_at, reward: r })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  }, [data.carnet, data.rewardRows]);

  // Les objets du programme : ceux gagnés s'ouvrent, les autres disent quand ils arrivent.
  const earned = new Set(data.rewardRows.map((r) => r.reward_id));
  const objets = REWARDS.filter((r) => r.available);

  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[36px] md:text-[44px] leading-[1.05] font-medium text-ink mt-2 text-balance">
        Le carnet de <em className="italic">{firstName}</em>
      </h1>

      {entries.length === 0 ? (
        <div className="nc-card mt-6">
          <p className="text-[17px] leading-[1.5] text-ink">Le carnet se remplit tout seul, moment après moment.</p>
          <Link href={P3_BASE} className="maison-launch inline-flex items-center gap-1.5 mt-4 h-12 px-6 rounded-full text-accent-on font-bold">
            La carte du soir <Icon name="arrow-right" className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <ol className="mt-7 space-y-5">
          {entries.map((e, n) =>
            e.moment ? (
              <li key={`m-${e.moment.activity_id}-${e.at}`}>
                <article className={`maison-paper flex gap-4 p-3.5 rounded-[22px] ${n % 2 ? 'motion-safe:rotate-[0.5deg]' : 'motion-safe:-rotate-[0.4deg]'}`}>
                  {vignetteSrc(e.moment.activity_id) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vignetteSrc(e.moment.activity_id)!}
                      alt=""
                      width={96}
                      height={96}
                      loading="lazy"
                      decoding="async"
                      className="w-[88px] h-[88px] md:w-24 md:h-24 shrink-0 self-start rounded-[13px] object-cover bg-[#efe9df]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-display italic text-[14px] text-[color:var(--paper-ink)] first-letter:uppercase">{formatLongDate(e.at)}</p>
                    <p className="mt-0.5 text-[15px] font-bold text-ink">{getActivity(e.moment.activity_id)?.title}</p>
                    {e.moment.kept_phrase && (
                      <blockquote className="mt-2 font-display text-[19px] md:text-[21px] leading-[1.3] text-ink text-pretty">« {e.moment.kept_phrase} »</blockquote>
                    )}
                    {captureItems(e.moment.capture).length > 0 && (
                      <ul className="mt-2 space-y-1 text-[15px] text-body">
                        {captureItems(e.moment.capture).map((c, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span aria-hidden className="w-2 h-2 mt-[8px] shrink-0 rounded-full bg-sage" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              </li>
            ) : e.reward ? (
              <li key={`r-${e.reward.reward_id}`}>
                <p className="font-display italic text-[14px] text-soft mb-2 first-letter:uppercase">{formatLongDate(e.at)}</p>
                <Link href={`${P3_BASE}/objets/${e.reward.reward_id}`} className="block" aria-label={rewardTitle(e.reward.reward_id, firstName)}>
                  <RewardView id={e.reward.reward_id} payload={e.reward.payload} earnedAt={e.reward.earned_at} firstName={firstName} compact />
                </Link>
              </li>
            ) : null
          )}
        </ol>
      )}

      <section aria-label="Les objets" className="mt-14">
        <p className="nc-eyebrow">Ce qu’on garde</p>
        <h2 className="font-display text-[28px] md:text-[32px] font-medium text-ink mt-1.5">Les objets de {firstName}</h2>
        <ul className="mt-5 space-y-3">
          {objets.map((r) =>
            earned.has(r.id) ? (
              <li key={r.id}>
                <Link href={`${P3_BASE}/objets/${r.id}`} className="maison-paper flex items-center gap-4 min-h-[76px] px-4 py-3.5 rounded-[22px]">
                  <span aria-hidden className="maison-star w-11 h-11 shrink-0">
                    <Icon name="star" className="w-[22px] h-[22px]" strokeWidth={1.7} fill="currentColor" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display text-[19px] font-medium leading-[1.2] text-ink">{rewardTitle(r.id, firstName)}</span>
                    <span className="block text-[13px] text-soft mt-0.5">Gagné · à ouvrir</span>
                  </span>
                  <Icon name="chevron-right" className="w-5 h-5 text-soft shrink-0" />
                </Link>
              </li>
            ) : (
              <li key={r.id} className="flex items-center gap-4 min-h-[72px] px-4 py-3.5 rounded-[22px] border-[1.5px] border-dashed border-line2">
                <span aria-hidden className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-chip text-faint">
                  <Icon name="lock" className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-body">{rewardTitle(r.id, firstName)}</span>
                  <span className="block text-[13px] text-soft mt-0.5">
                    {unlockLine(r.trigger)}
                    {r.bonus ? ` · ${r.bonus}` : ''}
                  </span>
                </span>
              </li>
            )
          )}
        </ul>
      </section>
    </div>
  );
}

/** Quand l'objet arrive, dit simplement (jamais un compte à rebours). */
function unlockLine(t: (typeof REWARDS)[number]['trigger']): string {
  switch (t.kind) {
    case 'week_complete':
      return `Il s’ouvre à la fin de la semaine ${t.week}`;
    case 'activity_done':
      return `Il s’ouvre après « ${getActivity(t.activity)?.title ?? 'l’activité'} »`;
    case 'moments':
      return `Il s’ouvre après ${t.count} moments`;
    default:
      return `Il s’ouvre après ${t.months} mois avec THRIVE Maison`;
  }
}

export default function CarnetPage() {
  return <P3Frame>{(ctx) => <Carnet ctx={ctx} />}</P3Frame>;
}
