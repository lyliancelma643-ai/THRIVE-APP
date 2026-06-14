'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { VideoSession, AgeGroup, Phase, PHASE_LABELS, ageGroupFromBirthDate } from '@/lib/catalog';
import { SessionCard } from '@/components/parent/SessionCard';

const AGE_GROUPS: AgeGroup[] = ['8-11', '12-14', '15-17'];
const PHASES: Phase[] = ['ANCRER', 'DEVELOPPER', 'INTEGRER'];

export default function LibraryPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>(
    ageGroupFromBirthDate(selectedChild?.date_of_birth ?? null) ?? 'all'
  );
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('lang', 'fr')
        .order('session_number');
      setSessions((data ?? []) as VideoSession[]);
      setLoading(false);
    })();
  }, []);

  const themes = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.theme))),
    [sessions]
  );

  const filtered = sessions.filter(
    (s) =>
      (ageFilter === 'all' || s.age_group === ageFilter) &&
      (phaseFilter === 'all' || s.phase === phaseFilter) &&
      (themeFilter === 'all' || s.theme === themeFilter)
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white mb-2">
        Toutes les séances
      </h1>
      <p className="text-white/55 mb-8">
        13 séances de 20 minutes par tranche d&apos;âge, à vivre parent et enfant.
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-8">
        <FilterGroup
          label="Âge"
          value={ageFilter}
          options={[
            { value: 'all', label: 'Tous' },
            ...AGE_GROUPS.map((a) => ({ value: a, label: `${a} ans` })),
          ]}
          onChange={(v) => setAgeFilter(v as AgeGroup | 'all')}
        />
        <FilterGroup
          label="Phase"
          value={phaseFilter}
          options={[
            { value: 'all', label: 'Toutes' },
            ...PHASES.map((p) => ({ value: p, label: PHASE_LABELS[p].split('— ')[1] })),
          ]}
          onChange={(v) => setPhaseFilter(v as Phase | 'all')}
        />
        <FilterGroup
          label="Thème"
          value={themeFilter}
          options={[{ value: 'all', label: 'Tous' }, ...themes.map((t) => ({ value: t, label: t }))]}
          onChange={setThemeFilter}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div key={s.id} className="[&>a]:w-full">
              <SessionCard session={s} />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-white/50 text-sm py-12 text-center">
          Aucune séance ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-bold uppercase tracking-wide text-white/45 shrink-0">{label}</span>
      <div className="flex gap-1 p-1 rounded-full glass-navy overflow-x-auto scrollbar-hide">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              value === opt.value
                ? 'bg-sun text-navy-900'
                : 'text-white/60 hover:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
