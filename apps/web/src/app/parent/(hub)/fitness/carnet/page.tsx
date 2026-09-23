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
import { P3_BASE, captureItems, formatLongDate, type P3MomentRow, type P3RewardRow } from '@/lib/p3-moments/app';

type Entry = { at: string; moment?: P3MomentRow; reward?: P3RewardRow };

function Carnet({ ctx }: { ctx: P3Ctx }) {
  const { data, firstName } = ctx;
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), []);

  const entries = useMemo<Entry[]>(() => {
    const visibleRewards = data.rewardRows.filter((r) => REWARDS.find((x) => x.id === r.reward_id)?.available);
    return [
      ...data.carnet.map((m) => ({ at: m.created_at, moment: m })),
      ...visibleRewards.map((r) => ({ at: r.earned_at, reward: r })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  }, [data.carnet, data.rewardRows]);

  return (
    <div className="max-w-2xl">
      <BackLink href={P3_BASE} label="Maison" />
      <h1 className="font-display text-[30px] md:text-[36px] font-semibold text-ink mt-2">Le carnet de {firstName}</h1>

      {entries.length === 0 ? (
        <div className="nc-card mt-6">
          <p className="text-[17px] leading-[1.5] text-ink">Le carnet se remplit tout seul, moment après moment.</p>
          <Link href={P3_BASE} className="inline-flex items-center gap-1.5 mt-4 h-12 px-6 rounded-full bg-accent text-accent-on font-bold">
            La carte du soir <Icon name="arrow-right" className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {entries.map((e) =>
            e.moment ? (
              <li key={`m-${e.moment.activity_id}-${e.at}`} className="nc-row p-5">
                <p className="text-[13px] text-faint first-letter:uppercase">{formatLongDate(e.at)}</p>
                <p className="mt-1 text-[16px] font-semibold text-ink">{getActivity(e.moment.activity_id)?.title}</p>
                {e.moment.kept_phrase && (
                  <blockquote className="mt-3 font-display text-[20px] leading-[1.35] text-ink">« {e.moment.kept_phrase} »</blockquote>
                )}
                {captureItems(e.moment.capture).length > 0 && (
                  <ul className="mt-3 space-y-1 text-[15px] text-body">
                    {captureItems(e.moment.capture).map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-accent-ink">—</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : e.reward ? (
              <li key={`r-${e.reward.reward_id}`}>
                <p className="text-[13px] text-faint mb-2 first-letter:uppercase">{formatLongDate(e.at)}</p>
                <Link href={`${P3_BASE}/objets/${e.reward.reward_id}`} className="block" aria-label={rewardTitle(e.reward.reward_id, firstName)}>
                  <RewardView id={e.reward.reward_id} payload={e.reward.payload} earnedAt={e.reward.earned_at} firstName={firstName} compact />
                </Link>
              </li>
            ) : null
          )}
        </ol>
      )}
    </div>
  );
}

export default function CarnetPage() {
  return <P3Frame>{(ctx) => <Carnet ctx={ctx} />}</P3Frame>;
}
