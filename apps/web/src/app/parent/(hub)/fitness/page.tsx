'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { useAccessStore } from '@/lib/access';
import { FitnessConstructionNotice, LockedBanner, GreyedSection } from '@/components/parent/AccessGate';
import {
  VideoSession,
  AgeGroup,
  Phase,
  PHASE_LABELS,
  ageGroupFromBirthDate,
} from '@/lib/catalog';
import { SessionRow } from '@/components/parent/SessionRow';
import { SessionCard } from '@/components/parent/SessionCard';
import { Icon } from '@/components/ui';

const AGE_GROUPS: AgeGroup[] = ['8-11', '12-14', '15-17'];
const PHASES: Phase[] = ['ANCRER', 'DEVELOPPER', 'INTEGRER'];

function FitnessPageInner() {
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

  // Le profil enfant peut arriver après le premier rendu (store async) : on
  // aligne alors le filtre d'âge sur sa tranche, idem au changement d'enfant.
  useEffect(() => {
    if (childAgeGroup) setAgeFilter(childAgeGroup);
  }, [childAgeGroup]);

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
        <div className="h-[420px] rounded-[26px] bg-night-surface animate-pulse" />
        <div className="h-32 rounded-[22px] bg-night-surface animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero — séance suivante : une seule affiche 16:9 étendue, dégradé de
          lisibilité vers le bas, aucun filigrane ni halo (direction 2a). */}
      {nextSession && (
        <Link
          href={`/parent/session/${nextSession.id}`}
          className="block group relative animate-om-up"
        >
          <div className="relative rounded-[26px] overflow-hidden flex flex-col justify-end h-[420px] md:h-[52vh] md:min-h-[440px] bg-night-surface">
            {/* Image de la séance quand elle existe ; sinon une trame discrète */}
            {nextSession.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nextSession.thumbnail_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'repeating-linear-gradient(135deg,rgba(255,255,255,.05) 0 12px,rgba(255,255,255,0) 12px 24px)',
                }}
              />
            )}

            {/* Voile de lisibilité */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top,rgba(2,20,27,.96) 0%,rgba(2,20,27,.65) 45%,rgba(2,20,27,0) 100%)',
              }}
            />

            <div className="relative p-6 md:p-10 max-w-2xl">
              <p className="text-sage text-xs font-bold uppercase tracking-[0.16em] mb-2.5">
                Séance {nextSession.session_number} · {nextSession.duration_minutes} min
                {selectedChild ? ` · ${selectedChild.first_name}` : ''}
              </p>
              <h1 className="font-display text-[32px] md:text-5xl text-night-ink font-semibold leading-[1.12] mb-2">
                {nextSession.title}
              </h1>
              <p className="text-[15px] md:text-lg leading-[1.5] text-[rgba(234,243,241,0.8)] mb-5">
                {nextSession.subtitle}
              </p>
              <span className="inline-flex items-center gap-2 h-[52px] px-6 rounded-full bg-sun text-navy-900 font-bold text-base group-hover:bg-sun-dark transition-colors">
                <Icon name="play" className="w-[18px] h-[18px]" />
                {completedIds.size > 0 ? 'Continuer la séance' : 'Lancer la séance'}
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Progression — posée à même le fond, sans carte */}
      {sessions.length > 0 && (
        <div className="mt-7 animate-om-up" style={{ ['--om-d' as string]: '0.1s' }}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-[rgba(234,243,241,0.8)]">
              Parcours 20 minutes{selectedChild ? ` de ${selectedChild.first_name}` : ''}
            </span>
            <span className="font-display text-[17px] font-semibold text-sun">
              {completedIds.size} / {sessions.length}
            </span>
          </div>
          <div className="nc-track mt-3">
            <div
              className="nc-fill bg-sun"
              style={{ width: `${(completedIds.size / Math.max(sessions.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Rangées par phase (carrousels horizontaux) */}
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
      <div className="mt-9">
        <h2 className="font-display text-[22px] md:text-3xl font-semibold text-night-ink mb-1.5">
          Toutes les séances
        </h2>
        <p className="text-sm md:text-[15px] leading-[1.5] text-[rgba(234,243,241,0.68)] mb-4">
          13 séances de 20 minutes par tranche d&apos;âge, à vivre parent et enfant.
        </p>

        {/* Filtres — pastilles : l'accent plein marque la valeur retenue */}
        <div className="flex flex-col gap-2.5 mb-7">
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
              { value: 'all', label: 'Toutes phases' },
              ...PHASES.map((p) => ({ value: p, label: PHASE_LABELS[p].split('— ')[1] })),
            ]}
            onChange={(v) => setPhaseFilter(v as Phase | 'all')}
          />
          <FilterGroup
            label="Thème"
            value={themeFilter}
            options={[{ value: 'all', label: 'Tous thèmes' }, ...themes.map((t) => ({ value: t, label: t }))]}
            onChange={setThemeFilter}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div key={s.id} className="[&>a]:w-full">
              <SessionCard session={s} completed={completedIds.has(s.id)} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-[rgba(234,243,241,0.55)] text-sm py-12 text-center">
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
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide overscroll-x-contain -mx-5 px-5 md:mx-0 md:px-0"
      role="group"
      aria-label={label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className="nc-pill shrink-0 select-none"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}


// ── Compte en préparation : aperçu réel des séances découverte (is_free) ─────
// Les cartes sont affichées mais inertes (GreyedSection) : le parent voit ce
// qui l'attend sans pouvoir lancer une séance avant l'activation.
function LockedFitnessPreview() {
  const [freeSessions, setFreeSessions] = useState<VideoSession[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('video_sessions')
        .select('*')
        .eq('is_active', true)
        .eq('lang', 'fr')
        .eq('is_free', true)
        .order('session_number');
      setFreeSessions((data ?? []) as VideoSession[]);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <LockedBanner />
      {freeSessions.length > 0 && (
        <GreyedSection
          title="Séances découverte"
          subtitle="Un aperçu offert du parcours — jouable dès l'activation de votre espace"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {freeSessions.map((s) => (
              <div key={s.id} className="[&>a]:w-full">
                <SessionCard session={s} />
              </div>
            ))}
          </div>
        </GreyedSection>
      )}
      <GreyedSection
        title="Fitness"
        subtitle="La bibliothèque de séances vidéo de votre enfant"
      />
    </div>
  );
}

// ── Garde d'accès : flag serveur fitness_enabled (Super Admin) ───────────────
// Flag OFF → « en construction » pour TOUS les comptes, quel que soit le statut.
export default function FitnessPage() {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) {
    return <div className="h-40 rounded-[22px] bg-night-surface animate-pulse" aria-hidden />;
  }
  if (!access.fitnessEnabled) return <FitnessConstructionNotice />;
  if (!access.unlocked) return <LockedFitnessPreview />;
  return <FitnessPageInner />;
}
