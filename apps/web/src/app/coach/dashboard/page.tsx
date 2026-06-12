'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAssignedChildren, childAge, AssignedChild, CoachSession } from '@/lib/coach';

export default function CoachDashboardPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<AssignedChild[]>([]);
  const [upcoming, setUpcoming] = useState<(CoachSession & { childName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const kids = await fetchAssignedChildren(user.id);
    setChildren(kids);

    if (kids.length > 0) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, program_id, child_id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .in('child_id', kids.map((k) => k.id))
        .eq('status', 'SCHEDULED')
        .gte('scheduled_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order('scheduled_at')
        .limit(8);

      const byId = new Map(kids.map((k) => [k.id, k.first_name]));
      setUpcoming(
        ((sessions ?? []) as CoachSession[]).map((s) => ({
          ...s,
          childName: byId.get(s.child_id),
        }))
      );
    } else {
      setUpcoming([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime : une assignation faite par l'admin apparaît en direct chez le coach
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`coach-dashboard-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_assignments' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, load]);

  const today = upcoming.filter(
    (s) => s.scheduled_at && new Date(s.scheduled_at).toDateString() === new Date().toDateString()
  );

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900 mb-1">
        Bonjour {user?.firstName} 👋
      </h1>
      <p className="text-navy-600/70 mb-8">Votre journée THRIVE en un coup d&apos;œil.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <StatCard value={children.length} label="Athlètes assignés" accent="bg-sun" />
        <StatCard value={today.length} label="Séances aujourd'hui" accent="bg-sage" />
        <StatCard value={upcoming.length} label="Séances à venir" accent="bg-navy-100" />
      </div>

      {/* Prochaines séances */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-semibold text-navy-900 mb-4">
          Prochaines séances 1:1
        </h2>
        {loading ? (
          <div className="h-24 rounded-2xl bg-navy-50 animate-pulse" />
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
            Aucune séance planifiée. Ouvrez la fiche d&apos;un athlète pour planifier son programme.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((s) => (
              <Link
                key={s.id}
                href={`/coach/athletes/${s.child_id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-shadow"
              >
                <span className="w-10 h-10 rounded-full bg-navy-50 text-navy-700 flex items-center justify-center font-display font-semibold">
                  {s.session_number}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-navy-900 truncate">
                    {s.childName} — {s.title}
                  </span>
                  <span className="block text-xs text-navy-600/60">
                    {s.scheduled_at &&
                      new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        hour: '2-digit', minute: '2-digit',
                      })}
                  </span>
                </span>
                <span className="text-xs text-navy-400">Ouvrir →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Mes athlètes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-navy-900">Mes athlètes</h2>
          <Link href="/coach/athletes" className="text-sm text-navy-600 hover:text-navy-900">
            Tout voir →
          </Link>
        </div>
        {children.length === 0 && !loading ? (
          <p className="text-sm text-navy-600/60 p-6 rounded-2xl bg-white shadow-card">
            Aucun athlète assigné pour l&apos;instant. L&apos;administrateur vous attribuera vos
            athlètes depuis son tableau de bord.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {children.map((c) => (
              <Link
                key={c.id}
                href={`/coach/athletes/${c.id}`}
                className="p-5 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-sun text-navy-900 flex items-center justify-center font-bold">
                    {c.first_name[0]}
                  </span>
                  <span>
                    <span className="block font-semibold text-navy-900">{c.first_name}</span>
                    <span className="block text-xs text-navy-600/60">
                      {childAge(c.date_of_birth) ?? '–'} ans · {c.sport ?? 'Hockey'}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white shadow-card flex items-center gap-4">
      <span className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center font-display text-xl font-semibold text-navy-900`}>
        {value}
      </span>
      <span className="text-sm text-navy-600/80 font-medium">{label}</span>
    </div>
  );
}
