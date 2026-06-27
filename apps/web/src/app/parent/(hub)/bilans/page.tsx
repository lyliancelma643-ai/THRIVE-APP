'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';

// Niveaux & acteurs conservés en donnée (protocole §1.4) — non affichés sur la carte
type Level = 'A' | 'B' | 'C';
type Actor = 'Jeune' | 'Coach' | 'Parent' | 'Mixte';

type Support = {
  id: string;
  title: string;
  sessions: string[];
  actorLabel: string;
  actor: Actor;
  level: Level;
  anchor: string;
  desc: string;
};

// Supports / outils du parcours THRIVE (protocole §8.5 + tableau de synthèse).
// `id` relie chaque support au contenu réel rempli par le coach (athlete_identity).
const SUPPORTS: Support[] = [
  {
    id: 'identite',
    title: 'Fiche Identité Athlète',
    sessions: ['S1'],
    actorLabel: 'Coach + Jeune ensemble',
    actor: 'Mixte',
    level: 'B',
    anchor: 'Forces VIA · Alliance SDT',
    desc: "Le jeune décrit son histoire sportive, nomme 2–3 forces VIA que le coach lui a reflétées, et formule son rêve de saison. Document de référence pour personnaliser les séances suivantes.",
  },
  {
    id: 'contrat',
    title: 'Contrat de confiance',
    sessions: ['S1'],
    actorLabel: 'Jeune + Parent + Coach',
    actor: 'Mixte',
    level: 'A',
    anchor: 'SDT Connexion · Consentement éclairé',
    desc: "Engagement co-signé par le jeune, le parent et le coach : cadre, confidentialité et consentement éclairé. Pose l'alliance et le lien de confiance du programme.",
  },
  {
    id: 'lsss',
    title: 'LSSS (Cronin & Allen, 2017)',
    sessions: ['S1', 'S7', 'S13'],
    actorLabel: 'Jeune (auto-évaluation)',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Life Skills Scale for Sport (validée)',
    desc: "Auto-évaluation validée des compétences de vie, administrée en S1, S7 et S13 pour mesurer objectivement la progression du jeune.",
  },
  {
    id: 'objectif',
    title: 'Fiche Objectif THRIVE',
    sessions: ['S2'],
    actorLabel: 'Jeune guidé par le coach',
    actor: 'Jeune',
    level: 'A',
    anchor: 'SMART · AGT · SDT compétence',
    desc: "Un objectif technique SMART + un objectif de life skill pour la saison, écrits par le jeune, accompagnés de « ce qui dépend uniquement de moi » : 3 actions concrètes.",
  },
  {
    id: 'emotions',
    title: 'Roue des Émotions Sportives THRIVE',
    sessions: ['S4', 'S5'],
    actorLabel: 'Jeune',
    actor: 'Jeune',
    level: 'B',
    anchor: 'Régulation émotionnelle · SDT',
    desc: "Le jeune identifie et nomme ses émotions en contexte sportif pour développer sa capacité de régulation émotionnelle.",
  },
  {
    id: 'routine',
    title: 'Routine pré-tir THRIVE',
    sessions: ['S6'],
    actorLabel: 'Jeune autonome',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Routines de performance · Self-Efficacy',
    desc: "Fiche plastifiée : une routine de pré-performance personnelle, répétable sous pression et exécutée en autonomie par le jeune.",
  },
  {
    id: 'focus',
    title: 'Fiche Focus Word THRIVE',
    sessions: ['S9'],
    actorLabel: 'Jeune',
    actor: 'Jeune',
    level: 'B',
    anchor: 'Self-talk · Focus word',
    desc: "Format billet plastifié : un mot d'activation personnel (focus word) au recto, une phrase d'activation au verso. À garder à portée pour activer le transfert hors du sport.",
  },
  {
    id: 'outils',
    title: 'Carte Boîte à Outils THRIVE',
    sessions: ['S11'],
    actorLabel: 'Jeune entièrement',
    actor: 'Jeune',
    level: 'A',
    anchor: 'Transfert conscient (Pierce et al., 2017)',
    desc: "Format poche : le jeune liste lui-même ses 6 outils THRIVE et, pour chacun, le contexte hors-sport où il l'utilise. Elle ne le quitte plus après S11.",
  },
  {
    id: 'lettre',
    title: 'Lettre à moi-même dans 1 an',
    sessions: ['S13'],
    actorLabel: 'Jeune (dicte ou écrit)',
    actor: 'Jeune',
    level: 'B',
    anchor: 'Identité positive · SDT',
    desc: "Le jeune écrit une lettre à son futur lui-même, scellée et remise au parent, ouverte 12 mois plus tard. Consolide une identité positive tournée vers la croissance.",
  },
  {
    id: 'certificat',
    title: 'Certificat THRIVE',
    sessions: ['S13'],
    actorLabel: 'Coach (remis au jeune)',
    actor: 'Coach',
    level: 'C',
    anchor: 'Reconnaissance symbolique',
    desc: "Reconnaissance symbolique remise au jeune à la fin du programme, qui marque le chemin parcouru sur les 13 séances.",
  },
];

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

type CoachInfo = { first_name: string; last_name: string } | null;

type ToolboxItem = { tool: string; context: string };
type ParentIdentity = {
  sport: string | null;
  position: string | null;
  club: string | null;
  sport_story: string | null;
  strengths: string[] | null;
  season_dream: string | null;
  smart_goal: string | null;
  life_skill_goal: string | null;
  my_actions: string[] | null;
  toolbox: ToolboxItem[] | null;
  focus_word: string | null;
  letter: string | null;
} | null;

export default function AthleteIdentityPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [coach, setCoach] = useState<CoachInfo>(null);
  const [completed, setCompleted] = useState(0);
  const [identity, setIdentity] = useState<ParentIdentity>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setCoach(null);
      setCompleted(0);
      setIdentity(null);
      setLoading(false);
      return;
    }
    const [sessionsRes, assignmentRes, identityRes] = await Promise.all([
      supabase.from('sessions').select('status').eq('child_id', selectedChildId),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
      supabase
        .from('athlete_identity')
        .select(
          'sport, position, club, sport_story, strengths, season_dream, smart_goal, life_skill_goal, my_actions, toolbox, focus_word, letter'
        )
        .eq('child_id', selectedChildId)
        .maybeSingle(),
    ]);
    setCompleted((sessionsRes.data ?? []).filter((s: any) => s.status === 'COMPLETED').length);
    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
    setIdentity((identityRes.data as ParentIdentity) ?? null);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Mise à jour en direct quand le coach/admin modifie la carte
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`identity-${selectedChildId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athlete_identity',
          filter: `child_id=eq.${selectedChildId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
          ◈
        </div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">
          Ajoute un enfant pour découvrir sa carte d&apos;identité d&apos;athlète THRIVE.
        </p>
      </div>
    );
  }

  const age = ageFromDob(selectedChild.date_of_birth);
  const initials =
    `${selectedChild.first_name?.[0] ?? ''}${selectedChild.last_name?.[0] ?? ''}`.toUpperCase();

  // Statistiques dérivées des données déjà chargées (aucune requête supplémentaire)
  const strengthsCount = identity?.strengths?.length ?? 0;
  const toolsCount = identity?.toolbox?.length ?? 0;
  const goalsCount = [identity?.smart_goal, identity?.life_skill_goal].filter(Boolean).length;
  const filledCount = SUPPORTS.filter((s) => supportHasContent(s.id, identity)).length;
  const filledTotal = SUPPORTS.filter((s) => SUPPORT_HAS_FIELDS.has(s.id)).length;

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Carte d&apos;identité</h1>
      <p className="text-white/55 mb-8">
        Le passeport THRIVE de {selectedChild.first_name} : son identité d&apos;athlète et tous les
        supports qui jalonnent son parcours de 13 séances.
      </p>

      {/* ── Carte passeport — en-tête premium ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl glass-navy ring-1 ring-white/10 p-6 md:p-8 mb-5">
        {/* Halos ambiants + filet lumineux supérieur */}
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-sun/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-sage/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          {/* Avatar + identité */}
          <div className="flex items-center gap-5 min-w-0 flex-1">
            <div className="shrink-0">
              {selectedChild.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedChild.avatar_url}
                  alt={selectedChild.first_name}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover ring-2 ring-sun/40"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-navy-500 to-navy-800 ring-2 ring-sun/40 flex items-center justify-center font-display text-2xl font-bold text-white">
                  {initials || '★'}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.25em] text-sun/80">
                Passeport athlète · THRIVE
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-white leading-tight mt-0.5">
                {selectedChild.first_name} {selectedChild.last_name ?? ''}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {age != null && <MetaChip>{age} ans</MetaChip>}
                <MetaChip>
                  <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                  {identity?.sport || 'Hockey sur glace'}
                </MetaChip>
                {identity?.position && <MetaChip>{identity.position}</MetaChip>}
                {identity?.club && <MetaChip>{identity.club}</MetaChip>}
                {coach && (
                  <MetaChip>
                    Coach{' '}
                    <span className="text-white/90 font-semibold">
                      {coach.first_name} {coach.last_name}
                    </span>
                  </MetaChip>
                )}
              </div>
            </div>
          </div>

          {/* Jauge de progression du programme — mène vers les séances */}
          <Link
            href="/parent/my-sessions"
            aria-label="Voir mes séances"
            className="group shrink-0 md:border-l md:border-white/10 md:pl-8 flex flex-col items-center cursor-pointer rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/40"
          >
            <ProgressGauge value={completed} max={13} loading={loading} />
            <p className="text-sm text-white/70 mt-1">
              <span className="font-display font-bold text-white tabular-nums">
                {loading ? '—' : completed}/13
              </span>{' '}
              séances
            </p>
            <p className="text-[11px] text-white/40 inline-flex items-center gap-1 transition-colors group-hover:text-white/70">
              Programme complété
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </p>
          </Link>
        </div>
      </div>

      {/* ── Bande de statistiques ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatTile icon="✓" value={completed} suffix="/13" label="Séances complétées" loading={loading} />
        <StatTile icon="✦" value={strengthsCount} label="Forces identifiées" loading={loading} />
        <StatTile icon="◎" value={goalsCount} suffix="/2" label="Objectifs fixés" loading={loading} />
        <StatTile icon="▦" value={toolsCount} label="Outils collectés" loading={loading} />
      </div>

      {/* ── Parcours & supports ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">
            Parcours &amp; supports THRIVE
          </h3>
          <p className="text-sm text-white/50 mt-0.5">
            Clique sur un support pour découvrir ce que {selectedChild.first_name} a construit avec
            son coach.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-white/45 px-3 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-sage" />
          {loading ? '—' : `${filledCount}/${filledTotal}`} renseignés par le coach
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        {SUPPORTS.map((s) => (
          <SupportCard key={s.id} support={s} identity={identity} />
        ))}
      </div>
    </div>
  );
}

/* ── Petits composants de présentation (UI only) ─────────────────────── */

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] ring-1 ring-white/10 text-xs text-white/65">
      {children}
    </span>
  );
}

function StatTile({
  icon,
  value,
  suffix,
  label,
  loading,
}: {
  icon: string;
  value: number;
  suffix?: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl glass-navy p-4 flex items-center gap-3">
      <span className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-sun text-lg">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold text-white tabular-nums leading-none">
          {loading ? '—' : value}
          {!loading && suffix && (
            <span className="text-sm font-sans font-medium text-white/35">{suffix}</span>
          )}
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

/* Jauge semi-circulaire (SVG) — progression du programme sur 13 séances */
function ProgressGauge({ value, max, loading }: { value: number; max: number; loading: boolean }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const R = 80;
  const CIRC = Math.PI * R; // longueur de l'arc semi-circulaire
  const dash = loading ? 0 : pct * CIRC;
  return (
    <div className="relative w-40 h-[88px]">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs>
          <linearGradient id="thrive-gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A7C4BC" />
            <stop offset="100%" stopColor="#F9EB50" />
          </linearGradient>
        </defs>
        {/* Piste */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Progression */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#thrive-gauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="font-display text-3xl font-bold text-white tabular-nums leading-none">
          {loading ? '—' : `${Math.round(pct * 100)}%`}
        </span>
      </div>
    </div>
  );
}

/* Supports qui possèdent des champs renseignables par le coach (athlete_identity) */
const SUPPORT_HAS_FIELDS = new Set(['identite', 'objectif', 'focus', 'outils', 'lettre']);

/* Le coach a-t-il rempli du contenu pour ce support ? (même logique que IdentityContent) */
function supportHasContent(id: string, identity: ParentIdentity): boolean {
  if (!identity) return false;
  switch (id) {
    case 'identite':
      return (
        Boolean(identity.sport_story) ||
        (identity.strengths?.length ?? 0) > 0 ||
        Boolean(identity.season_dream)
      );
    case 'objectif':
      return (
        Boolean(identity.smart_goal) ||
        Boolean(identity.life_skill_goal) ||
        (identity.my_actions?.length ?? 0) > 0
      );
    case 'focus':
      return Boolean(identity.focus_word);
    case 'outils':
      return (identity.toolbox?.length ?? 0) > 0;
    case 'lettre':
      return Boolean(identity.letter);
    default:
      return false;
  }
}

/* Contenu réel rempli par le coach, mappé au support concerné */
function IdentityContent({ id, identity }: { id: string; identity: ParentIdentity }) {
  if (!identity) return null;
  const strengths = identity.strengths ?? [];
  const actions = identity.my_actions ?? [];
  const toolbox = identity.toolbox ?? [];

  const text = (v: string) => (
    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">{v}</p>
  );

  const blocks: { label: string; node: ReactNode }[] = [];
  if (id === 'identite') {
    if (identity.sport_story)
      blocks.push({ label: 'Histoire sportive', node: text(identity.sport_story) });
    if (strengths.length > 0)
      blocks.push({
        label: 'Forces',
        node: (
          <div className="flex flex-wrap gap-2">
            {strengths.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-sage/20 text-sage text-sm font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        ),
      });
    if (identity.season_dream)
      blocks.push({
        label: 'Rêve de saison',
        node: (
          <p className="text-sm text-white/85 leading-relaxed italic">« {identity.season_dream} »</p>
        ),
      });
  } else if (id === 'objectif') {
    if (identity.smart_goal)
      blocks.push({ label: 'Objectif technique (SMART)', node: text(identity.smart_goal) });
    if (identity.life_skill_goal)
      blocks.push({ label: 'Objectif life skill', node: text(identity.life_skill_goal) });
    if (actions.length > 0)
      blocks.push({
        label: 'Ce qui dépend de moi',
        node: (
          <ul className="space-y-1.5">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                <span className="text-sun mt-0.5 shrink-0">✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        ),
      });
  } else if (id === 'focus') {
    if (identity.focus_word)
      blocks.push({
        label: 'Son focus word',
        node: <p className="font-display text-xl font-semibold text-sun">{identity.focus_word}</p>,
      });
  } else if (id === 'outils') {
    if (toolbox.length > 0)
      blocks.push({
        label: 'Ses outils',
        node: (
          <ul className="space-y-2">
            {toolbox.map((t, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-white">{t.tool}</span>
                {t.context && <span className="text-white/55"> — {t.context}</span>}
              </li>
            ))}
          </ul>
        ),
      });
  } else if (id === 'lettre') {
    if (identity.letter) blocks.push({ label: 'Sa lettre', node: text(identity.letter) });
  }

  if (blocks.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sun/80">
        Renseigné par le coach
      </p>
      {blocks.map((b) => (
        <div key={b.label}>
          <span className="block text-xs font-semibold text-white/45 mb-1">{b.label}</span>
          {b.node}
        </div>
      ))}
    </div>
  );
}

/* Carte de support repliable — clic pour révéler la description + ce que le coach a rempli.
   Badge de séance + indicateur « Renseigné ». Contenu borné (retour à la ligne forcé). */
function SupportCard({ support, identity }: { support: Support; identity: ParentIdentity }) {
  const [open, setOpen] = useState(false);
  const filled = supportHasContent(support.id, identity);
  const sessionsLabel = support.sessions.join(' · ');
  return (
    <section
      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
        open
          ? 'border-sun/40 bg-white/[0.06]'
          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
      >
        {/* Badge séance */}
        <span
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-display text-sm font-bold leading-none ${
            filled ? 'bg-sun/15 text-sun ring-1 ring-sun/30' : 'bg-white/[0.06] text-white/70'
          }`}
        >
          {support.sessions[0]}
        </span>

        {/* Titre + méta */}
        <span className="min-w-0 flex-1">
          <span
            className={`block font-display text-base font-semibold leading-tight transition-colors ${
              open ? 'text-sun' : 'text-white'
            }`}
          >
            {support.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
            <span className="text-[11px] text-white/45">
              {support.sessions.length > 1 ? `Séances ${sessionsLabel}` : `Séance ${sessionsLabel}`}
            </span>
            {filled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sage">
                <span className="w-1.5 h-1.5 rounded-full bg-sage" /> Renseigné
              </span>
            )}
          </span>
        </span>

        {/* Chevron */}
        <span
          aria-hidden
          className={`shrink-0 text-white/40 text-sm transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[4.5rem] break-words [overflow-wrap:anywhere]">
          <p className="text-sm text-white/75 leading-relaxed">{support.desc}</p>
          <p className="text-[11px] text-white/40 mt-3">
            <span className="uppercase tracking-wide">Ancrage</span> · {support.anchor}
          </p>
          <IdentityContent id={support.id} identity={identity} />
        </div>
      )}
    </section>
  );
}
