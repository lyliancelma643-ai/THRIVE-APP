'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAssignedChildren, childAge, AssignedChild } from '@/lib/coach';
import { PendingFamiliesPanel } from '@/components/coach/PendingFamiliesPanel';

export default function CoachAthletesPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<AssignedChild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setChildren(await fetchAssignedChildren(user.id));
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-2">Mes athlètes</h1>
      <p className="text-navy-600/70 mb-8">
        Les enfants que l&apos;administrateur vous a confiés.
      </p>

      {user?.id && <PendingFamiliesPanel coachId={user.id} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-navy-50 animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
          Aucun athlète assigné pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-3">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/coach/athletes/${c.id}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-shadow"
            >
              <span className="w-12 h-12 rounded-full bg-sun text-navy-900 flex items-center justify-center text-lg font-bold">
                {c.first_name[0]}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-navy-900">
                  {c.first_name} {c.last_name ?? ''}
                </span>
                <span className="block text-xs text-navy-600/60">
                  {childAge(c.date_of_birth) ?? '–'} ans · {c.sport ?? 'Hockey'}
                </span>
              </span>
              <span className="text-xs text-navy-400">Programme & bilans →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
