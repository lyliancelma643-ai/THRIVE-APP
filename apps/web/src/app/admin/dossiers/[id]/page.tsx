'use client';

// Admin / super admin — correction du dossier d'un athlète via le même espace
// de travail que le coach (héritage total des permissions coach par RLS).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { childAge, AssignedChild } from '@/lib/coach';
import { AthleteWorkspace } from '@/components/coach/AthleteWorkspace';

export default function AdminDossierPage() {
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
      <div className="max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!child) {
    return <p className="text-slate-600">Athlète introuvable ou hors de votre périmètre.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/dossiers" className="text-sm text-slate-500 hover:text-slate-900">
        ← Suivi des dossiers
      </Link>

      <div className="flex items-center gap-4 mt-4 mb-6">
        <span className="w-14 h-14 rounded-full bg-navy-600 text-white flex items-center justify-center text-xl font-bold">
          {child.first_name[0]}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {child.first_name} {child.last_name ?? ''}
          </h1>
          <p className="text-sm text-slate-500">
            {childAge(child.date_of_birth) ?? '–'} ans · {child.sport ?? 'Hockey'} · correction admin
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
