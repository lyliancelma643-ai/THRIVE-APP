'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import {
  VideoSession,
  AgeGroup,
  Phase,
  PHASE_LABELS,
  ageGroupFromBirthDate,
  themeAccent,
} from '@/lib/catalog';
import { SessionRow } from '@/components/parent/SessionRow';
import { SessionCard } from '@/components/parent/SessionCard';

const AGE_GROUPS: AgeGroup[] = ['8-11', '12-14', '15-17'];
const PHASES: Phase[] = ['ANCRER', 'DEVELOPPER', 'INTEGRER'];

export default function FitnessPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;
  const childAgeGroup = ageGroupFromBirthDate(selectedChild?.date_of_birth ?? null);

  const [allSessions, setAllSessions] = useState<VideoSession[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Filtres de la bibliothèque (section « Toutes les séances »)
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>(childAgeGroup ?? 'all');
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');

  // Une seule requête catalogue : le parcours et la bibliothèque s'y partagent
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('lang', 'fr')
        .order('session_number');
      setAllSessions((data ?? []) as VideoSession[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    (async () => {
      const { data } = await supabase
        .from('video_session_runs')
        .select('video_session_id, completed_at')
        .eq('child_id', selectedChildId)
        .not('completed_at', 'is', null);
      setCompletedIds(new Set((data ?? []).map((r) => r.video_session_id)));
    })();
  }, [selectedChildId]);

  // Parcours : la tranche d'âge de l'enfant (sans profil, on évite les triplons : 8-11)
  const sessions = useMemo(
    () => allSessions.filter((s) => s.age_group === (childAgeGroup ?? '8-11')),
    [allSessions, childAgeGroup]
  );

  const nextSession = useMemo(
    () => sessions.find((s) => !completedIds.has(s.id)) ?? sessions[0],
    [sessions, completedIds]
  );

  const byPhase = useMemo(
    () => ({
      ANCRER: sessions.filter((s) => s.phase === 'ANCRER'),
      DEVELOPPER: sessions.filter((s) => s.phase === 'DEVELOPPER'),
      INTEGRER: sessions.filter((s) => s.phase === 'INTEGRER'),
    }),
    [sessions]
  );

  const themes = useMemo(
    () => Array.from(new Set(allSessions.map((s) => s.theme))),
    [allSessions]
  );

  const filtered = allSessions.filter(
    (s) =>
      (ageFilter === 'all' || s.age_group === ageFilter) &&
      (phaseFilter === 'all' || s.phase === phaseFilter) &&
      (themeFilter === 'all' || s.theme === themeFilter)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-72 rounded-3xl bg-white/5 animate-pulse" />
        <div className="h-40 rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero — séance suivante : grande bannière (≈ moitié de l'écran).
          Fond coloré aujourd'hui, image de la séance (thumbnail_url) demain. */}
      {nextSession && (
        <Link
          href={`/parent/session/${nextSession.id}`}
          className="block group relative mb-10 md:mb-14"
        >
          <div
            className={`relative rounded-3xl overflow-hidden flex items-end h-[50vh] min-h-[400px] shadow-card group-hover:shadow-card-hover transition-all bg-gradient-to-br ${themeAccent(nextSession.theme).glow}`}
          >
            {/* Image de fond de la séance (quand elle sera disponible) */}
            {nextSession.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nextSession.thumbnail_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Grand numéro en filigrane */}
            <span className="pointer-events-none absolute -top-10 -right-4 md:right-2 font-display text-[11rem] md:text-[22rem] leading-none text-white/10 select-none">
              {nextSession.session_number}
            </span>

            {/* Voile sombre pour garder le texte lisible sur l'image */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/35 to-transparent" />

            <div className="relative p-6 md:p-12 max-w-2xl">
              <p className="text-sun text-xs font-bold uppercase tracking-[0.2em] mb-3">
                {completedIds.size > 0 ? 'Continuer le parcours' : 'Commencer le parcours'}
                {selectedChild ? ` · ${selectedChild.first_name}` : ''}
              </p>
              <h1 className="font-display text-3xl md:text-5xl text-white font-semibold leading-tight mb-2">
                {nextSession.title}
              </h1>
              <p className="text-navy-100/90 text-base md:text-lg mb-2">
                {nextSession.subtitle}
              </p>
              <p className="text-sage text-sm mb-7">
                Séance {nextSession.session_number} · {PHASE_LABELS[nextSession.phase]} ·{' '}
                {nextSession.duration_minutes} min · {nextSession.age_group} ans
              </p>
              <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-sun text-navy-900 font-bold text-sm shadow-card group-hover:bg-sun-dark group-hover:scale-[1.03] transition-all">
                ▶ Lancer la séance
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Progression */}
      {sessions.length > 0 && (
        <div className="mb-12 p-6 rounded-2xl glass-navy">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Parcours 20 minutes{selectedChild ? ` de ${selectedChild.first_name}` : ''}
            </h2>
            <span className="text-sm text-white/60 font-medium">
              {completedIds.size} / {sessions.length} séances
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sage to-sun transition-all"
              style={{ width: `${(completedIds.size / Math.max(sessions.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Rangées par phase (style Apple Fitness+) */}
      <SessionRow
        title={PHASE_LABELS.ANCRER}
        subtitle="Créer l'alliance, mesurer le point de départ, fixer le cap."
        sessions={byPhase.ANCRER}
        completedIds={completedIds}
      />
      <SessionRow
        title={PHASE_LABELS.DEVELOPPER}
        subtitle="Apprendre chaque life skill, séance par séance."
        sessions={byPhase.DEVELOPPER}
        completedIds={completedIds}
      />
      <SessionRow
        title={PHASE_LABELS.INTEGRER}
        subtitle="Consolider, transférer hors du sport, célébrer."
        sessions={byPhase.INTEGRER}
        completedIds={completedIds}
      />

      {/* ── Bibliothèque complète (ex-page « Toutes les séances ») ── */}
      <div className="mt-14 pt-10 border-t border-white/10">
        <h2 className="font-display text-3xl font-semibold text-white mb-2">
          Toutes les séances
        </h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div key={s.id} className="[&>a]:w-full">
              <SessionCard session={s} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-white/50 text-sm py-12 text-center">
            Aucune séance ne correspond à ces filtres.
          </p>
        )}
      </div>
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
      <div className="flex gap-1 p-1 rounded-full glass-navy overflow-x-auto scrollbar-hide overscroll-x-contain">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`px-4 py-2.5 min-h-[42px] rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors select-none ${
              value === opt.value
                ? 'bg-sun text-navy-900 font-semibold'
                : 'text-white/60 hover:bg-white/10 active:bg-white/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
