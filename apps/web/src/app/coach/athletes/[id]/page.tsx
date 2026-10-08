'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { useParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { childAge, AssignedChild } from '@/lib/coach';
import { ageGroupFromBirthDate } from '@/lib/catalog';
import { AthleteWorkspace } from '@/components/coach/AthleteWorkspace';
import { WriteToParentButton } from '@/components/coach/WriteToParentButton';

type NextSession = { id: string; session_number: number | null; title: string | null };

export default function CoachAthletePage() {
  const params = useParams<{ id: string }>();
  const [child, setChild] = useState<AssignedChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextSession, setNextSession] = useState<NextSession | null>(null);

  const load = useCallback(async () => {
    if (!params?.id) return;
    const [{ data }, { data: upcoming }] = await Promise.all([
      supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth, sport, family_id')
        .eq('id', params.id)
        .single(),
      supabase
        .from('sessions')
        .select('id, session_number, title')
        .eq('child_id', params.id)
        .in('status', ['SCHEDULED', 'IN_PROGRESS'])
        .order('session_number')
        .limit(1),
    ]);
    setChild((data ?? null) as AssignedChild | null);
    setNextSession(((upcoming ?? [])[0] ?? null) as NextSession | null);
    setLoading(false);
  }, [params?.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-4xl space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-navy-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!child) {
    return <p className="text-navy-600">Athlète introuvable ou non assigné.</p>;
  }

  const ageGroup = ageGroupFromBirthDate(child.date_of_birth);

  return (
    <div className="max-w-4xl">
      <Link href="/coach/athletes" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-navy-600 hover:text-navy-900">
        <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
        Mes athlètes
      </Link>

      <div className="flex flex-wrap items-center gap-4 mt-4 mb-6">
        <span className="w-14 h-14 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl font-bold">
          {child.first_name[0]}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">
            {child.first_name} {child.last_name ?? ''}
          </h1>
          <p className="text-sm text-navy-600/80">
            {childAge(child.date_of_birth) ?? '–'} ans (groupe {ageGroup}) · {child.sport ?? 'Hockey'}
          </p>
        </div>
        <WriteToParentButton
          childId={child.id}
          childName={child.first_name}
          className="sm:ml-auto"
        />
      </div>

      {nextSession && (
        <Link
          href={`/coach/athletes/${child.id}/session/${nextSession.id}`}
          className="mb-6 flex items-center justify-between gap-4 p-4 rounded-2xl bg-sun text-navy-900 shadow-card hover:shadow-card-hover transition-shadow"
        >
          <span className="min-w-0">
            <span className="block text-xs font-bold uppercase tracking-[0.15em] text-navy-900/70">
              Prochaine séance · {nextSession.session_number ?? '–'}/13
            </span>
            <span className="block font-semibold truncate">{nextSession.title}</span>
          </span>
          <span className="shrink-0 px-4 py-2 rounded-full bg-navy-900 text-white text-sm font-bold">
            Conduire →
          </span>
        </Link>
      )}

      <AthleteWorkspace
        childId={child.id}
        childName={child.first_name}
        dateOfBirth={child.date_of_birth}
      />
    </div>
  );
}
