'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { childAge, AssignedChild } from '@/lib/coach';
import { ageGroupFromBirthDate } from '@/lib/catalog';
import { AthleteWorkspace } from '@/components/coach/AthleteWorkspace';

export default function CoachAthletePage() {
  const params = useParams<{ id: string }>();
  const [child, setChild] = useState<AssignedChild | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!params?.id) return;
    const { data } = await supabase
      .from('children')
      .select('id, first_name, last_name, date_of_birth, sport, family_id')
      .eq('id', params.id)
      .single();
    setChild((data ?? null) as AssignedChild | null);
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
      <Link href="/coach/athletes" className="text-sm text-navy-600/70 hover:text-navy-900">
        ← Mes athlètes
      </Link>

      <div className="flex items-center gap-4 mt-4 mb-6">
        <span className="w-14 h-14 rounded-full bg-sun text-navy-900 flex items-center justify-center text-xl font-bold">
          {child.first_name[0]}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">
            {child.first_name} {child.last_name ?? ''}
          </h1>
          <p className="text-sm text-navy-600/70">
            {childAge(child.date_of_birth) ?? '–'} ans (groupe {ageGroup}) · {child.sport ?? 'Hockey'}
          </p>
        </div>
      </div>

      <AthleteWorkspace
        childId={child.id}
        childName={child.first_name}
        dateOfBirth={child.date_of_birth}
      />
    </div>
  );
}
