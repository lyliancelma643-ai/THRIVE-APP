'use client';

// E4 / E5 — Mode activité puis synthèse (même page).
// Route : /parent/fitness/[activityId]/moment?duree=10|20|30&lieu=maison|exterieur|voiture[&bande=8-11|12-14|15-17]

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { P3Frame } from '@/components/parent/p3/P3Frame';
import { ActivityMode } from '@/components/parent/p3/ActivityMode';
import { effectiveDuration, getActivity, isVisible } from '@/lib/p3-moments';
import { P3_BASE, p3Pool, parseBand, parseDuration, parsePlace } from '@/lib/p3-moments/app';

function MomentPage() {
  const params = useParams<{ activityId: string }>();
  const search = useSearchParams();
  const activity = getActivity(String(params.activityId ?? ''));
  const allowed = activity && p3Pool().some((a) => a.id === activity.id);
  const place = parsePlace(search.get('lieu'));
  const band = parseBand(search.get('bande'));

  return (
    <P3Frame>
      {(ctx) => {
        // Liberté totale : toute fiche cœur publiée se lance, quelle que soit la semaine en cours ;
        // un complément, dès que sa semaine est ouverte.
        if (!activity || !allowed || !isVisible(activity, ctx.data.openWeek)) {
          return (
            <div className="py-16 text-center">
              <p className="text-[16px] text-body">Cette fiche n&apos;est pas encore disponible.</p>
              <Link href={P3_BASE} className="inline-block mt-4 min-h-[44px] font-semibold text-accent-ink underline">
                Retour à Maison
              </Link>
            </div>
          );
        }
        const duration = effectiveDuration(activity, parseDuration(search.get('duree'))) ?? activity.base_duration;
        // En voiture, seules les fiches 100 % verbales se jouent en mode route.
        const safePlace = place === 'voiture' && !activity.car_ok ? 'maison' : place;
        return <ActivityMode ctx={band ? { ...ctx, band } : ctx} activity={activity} duration={duration} place={safePlace} />;
      }}
    </P3Frame>
  );
}

export default function Page() {
  return (
    <Suspense>
      <MomentPage />
    </Suspense>
  );
}
