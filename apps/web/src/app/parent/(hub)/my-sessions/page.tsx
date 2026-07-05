'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { PHASE_LABELS, Phase } from '@/lib/catalog';
import { THRIVE_SESSIONS } from '@/lib/coach';
import { type Pack, asPack, canSeePremium, upgradeHint } from '@/lib/packs';

type OneToOneSession = {
  id: string;
  session_number: number | null;
  title: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  scheduled_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
};

type Report = {
  id: string;
  child_id: string;
  content: Record<string, unknown> | null;
  created_at: string;
};

type CoachInfo = { first_name: string; last_name: string } | null;

const STATUS_STYLES: Record<OneToOneSession['status'], { label: string; cls: string }> = {
  SCHEDULED: { label: 'Planifiée', cls: 'bg-navy-50 text-navy-600' },
  IN_PROGRESS: { label: 'En cours', cls: 'bg-sun text-navy-900' },
  COMPLETED: { label: 'Terminée', cls: 'bg-sage text-navy-900' },
  CANCELLED: { label: 'Annulée', cls: 'bg-red-100 text-red-700' },
  MISSED: { label: 'Manquée', cls: 'bg-red-50 text-red-500' },
};

function phaseOfSession(n: number | null): Phase {
  if (!n || n <= 2) return 'ANCRER';
  if (n <= 10) return 'DEVELOPPER';
  return 'INTEGRER';
}

export default function MySessionsPage() {
  const { children, selectedChildId, isLoading: childrenLoading } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [sessions, setSessions] = useState<OneToOneSession[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [coach, setCoach] = useState<CoachInfo>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack>('ESSENTIEL');

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setSessions([]);
      setReports([]);
      setCoach(null);
      setLoading(false);
      return;
    }
    const [sessionsRes, reportsRes, assignmentRes, familyRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .eq('child_id', selectedChildId)
        .order('session_number', { ascending: true, nullsFirst: false }),
      supabase
        .from('reports')
        .select('id, child_id, content, created_at')
        .eq('child_id', selectedChildId)
        .order('created_at', { ascending: false }),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
      supabase
        .from('children')
        .select('family:families (pack)')
        .eq('id', selectedChildId)
        .maybeSingle(),
    ]);

    setSessions((sessionsRes.data ?? []) as OneToOneSession[]);
    setReports((reportsRes.data ?? []) as Report[]);
    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
    const familyRel = (familyRes.data as any)?.family;
    const famPack = Array.isArray(familyRel) ? familyRel[0]?.pack : familyRel?.pack;
    setPack(asPack(famPack));
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Mise à jour automatique en temps réel (séances + bilans)
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`my-sessions-${selectedChildId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `child_id=eq.${selectedChildId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: `child_id=eq.${selectedChildId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'families' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  // La liste des enfants charge encore : squelette plutôt qu'un flash
  // trompeur de l'état « Aucun profil enfant ».
  if (!selectedChild && childrenLoading) {
    return (
      <div className="space-y-4" aria-busy role="status" aria-label="Chargement">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <EmptyState
        title="Aucun profil enfant"
        body="Ajoute un enfant pour voir son programme de 13 séances avec son coach THRIVE."
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  // Séance sélectionnée → alimente le lecteur de bilan (panneau de droite ≥ lg)
  const selectedSession = selectedId
    ? sessions.find((x) => x.id === selectedId) ?? null
    : null;
  const selectedReport = selectedSession
    ? reports.find(
        (r) =>
          (r.content as any)?.session_id === selectedSession.id ||
          (r.content as any)?.session_number === selectedSession.session_number
      ) ?? null
    : null;
  const selectedTpl = selectedSession
    ? THRIVE_SESSIONS.find((t) => t.num === selectedSession.session_number) ?? null
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Colonne gauche — le programme de séances */}
      <div>
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Mes séances</h1>
      <p className="text-white/55 mb-8">
        Le programme 1:1 de {selectedChild.first_name}
        {coach ? (
          <>
            {' '}avec <span className="font-medium text-white">{coach.first_name} {coach.last_name}</span>, coach THRIVE
          </>
        ) : null}
        . Mise à jour automatique après chaque séance.
      </p>

      {/* Jauge de progression */}
      <div className="mb-10 p-6 rounded-2xl glass-navy text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-lg">Progression du programme</span>
          <span className="text-sun font-bold">{completedCount} / 13</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sage to-sun transition-all"
            style={{ width: `${(completedCount / 13) * 100}%` }}
          />
        </div>
        {sessions.length === 0 && (
          <p className="text-xs text-navy-100/70 mt-3">
            Les séances s&apos;activeront dès qu&apos;un coach THRIVE sera attribué à{' '}
            {selectedChild.first_name}.
          </p>
        )}
      </div>

      {/* Les 13 séances : grisées tant que le coach n'a pas validé,
          éclairées dès la validation (mise à jour en direct) */}
      <div className="space-y-3">
        {THRIVE_SESSIONS.map((tpl) => {
          const s = sessions.find((x) => x.session_number === tpl.num) ?? null;
          const isDone = s?.status === 'COMPLETED';
          const phase = phaseOfSession(tpl.num);
          const report = isDone && s
            ? reports.find(
                (r) =>
                  (r.content as any)?.session_id === s.id ||
                  (r.content as any)?.session_number === s.session_number
              ) ?? null
            : null;
          const rowId = s?.id ?? `tpl-${tpl.num}`;
          const isSelected = selectedId === rowId;
          const hasDetails = Boolean(report || (isDone && s?.coach_notes));

          return (
            <div
              key={rowId}
              className={`rounded-2xl overflow-hidden transition-all duration-500 ${
                isDone
                  ? 'glass-navy ring-1 ring-sage/40'
                  : 'bg-navy-900/50 backdrop-blur-md opacity-80'
              } ${isSelected ? 'ring-2 ring-sun/70' : ''}`}
            >
              <button
                disabled={!hasDetails}
                aria-pressed={hasDetails ? isSelected : undefined}
                className={`w-full flex items-center gap-4 p-5 text-left ${
                  hasDetails ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={() => hasDetails && setSelectedId(isSelected ? null : rowId)}
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-semibold shrink-0 ${
                    isDone ? 'bg-sage text-navy-900' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {isDone ? '✓' : tpl.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block font-semibold truncate ${
                      isDone ? 'text-white' : 'text-white/55'
                    }`}
                  >
                    {s?.title ?? tpl.title}
                  </span>
                  <span
                    className={`block text-xs mt-0.5 ${
                      isDone ? 'text-white/55' : 'text-white/35'
                    }`}
                  >
                    {PHASE_LABELS[phase]}
                    {s?.scheduled_at &&
                      ` · ${new Date(s.scheduled_at).toLocaleDateString('fr-CA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}`}
                  </span>
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isDone ? 'bg-sage text-navy-900' : 'bg-white/10 text-white/45'
                  }`}
                >
                  {isDone ? 'Validée par le coach' : 'À venir'}
                </span>
                {hasDetails && (
                  <span
                    className={`text-base leading-none transition-colors ${
                      isSelected ? 'text-sun' : 'text-white/35'
                    }`}
                    aria-hidden
                  >
                    ›
                  </span>
                )}
              </button>

              {/* Lecture inline — réservée au mobile (le panneau latéral prend le relais ≥ lg) */}
              {isSelected && hasDetails && s && (
                <div className="lg:hidden px-5 pb-5 pt-3 border-t border-white/10">
                  <BilanDetails session={s} report={report} pack={pack} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>

      {/* Colonne droite — lecteur du bilan du coach */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          {selectedSession ? (
            <BilanPanel
              session={selectedSession}
              report={selectedReport}
              pack={pack}
              phaseLabel={PHASE_LABELS[phaseOfSession(selectedSession.session_number)]}
              fallbackTitle={selectedTpl?.title ?? null}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <BilanReaderEmpty />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">
        ★
      </div>
      <h2 className="font-display text-2xl font-semibold text-white mb-3">{title}</h2>
      <p className="text-white/55">{body}</p>
    </div>
  );
}

/* Échelle de couleur des notes : vert (fort) → jaune (moyen) → gris (faible / sans couleur) */
const NOTE_COLORS: Record<number, string> = {
  5: '#34D399', // vert plein
  4: '#A3E635', // vert-lime
  3: '#F9EB50', // jaune (accent sun)
  2: '#B7AE72', // jaune éteint
  1: '#6B7280', // gris — « sans couleur »
};

/* Jauge circulaire incurvée — note /5 au centre, anneau coloré selon le niveau.
   `locked` : anneau (couleurs + cercle) visible mais chiffre flouté (teaser d'upgrade). */
function ScoreGauge({ note, max = 5, locked = false }: { note: number; max?: number; locked?: boolean }) {
  const value = Math.max(0, Math.min(max, Math.round(note)));
  const pct = (value / max) * 100;
  const color = NOTE_COLORS[value] ?? '#6B7280';
  return (
    <div
      className="relative w-16 h-16 shrink-0"
      role="img"
      aria-label={locked ? 'Note masquée — réservée aux packs supérieurs' : `Note ${value} sur ${max}`}
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-display font-bold text-white text-lg leading-none tabular-nums ${
            locked ? 'blur-[6px] select-none' : ''
          }`}
          aria-hidden={locked}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/* Carte de section interactive — réagit au survol (lift + halo accent, titre qui s'allume) */
function BilanCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-sun/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-navy-900/40 motion-safe:hover:-translate-y-0.5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-white/45 mb-2 transition-colors group-hover:text-sun">
        {title}
      </h4>
      {children}
    </section>
  );
}

function fieldLabel(key: string): string {
  if (key === 'message du coach') return 'Message du coach';
  const k = key.replace(/_/g, ' ').trim();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/* Cadenas (SVG — pas d'emoji, cf. règles d'icônes) */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* Bandeau d'incitation à l'upgrade — affiché sur les sections verrouillées */
function UpgradeHintBar({ pack }: { pack: Pack }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-sun/30 bg-sun/[0.08] px-3 py-2.5">
      <LockIcon className="w-4 h-4 text-sun shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-white/85">
        <span className="font-semibold text-sun">Contenu réservé.</span> {upgradeHint(pack)}
      </p>
    </div>
  );
}

/* Aperçu flouté d'un contenu texte verrouillé (aucune donnée réelle exposée) */
function LockedText({ pack }: { pack: Pack }) {
  return (
    <div>
      <div aria-hidden className="space-y-2 mb-3 blur-[5px] select-none pointer-events-none">
        <div className="h-3 rounded bg-white/15 w-[95%]" />
        <div className="h-3 rounded bg-white/15 w-[88%]" />
        <div className="h-3 rounded bg-white/15 w-[72%]" />
      </div>
      <UpgradeHintBar pack={pack} />
    </div>
  );
}

/* Corps du bilan — 3 sections gérées par le pack de la famille ; partagé entre la
   lecture inline (mobile) et le panneau latéral (desktop).
   Message → tous les packs · Bilan détaillé + Observations → Performance (toutes
   les séances) / Avancé (séances 3, 7, 13) / Essentiel (verrouillé). */
function BilanDetails({
  session,
  report,
  pack,
}: {
  session: OneToOneSession;
  report: Report | null;
  pack: Pack;
}) {
  const content = (report?.content ?? {}) as Record<string, unknown>;
  const observations =
    content.observations && typeof content.observations === 'object'
      ? (content.observations as Record<string, number>)
      : null;
  const messageRaw =
    session.coach_notes?.trim() ||
    (typeof content['message du coach'] === 'string'
      ? (content['message du coach'] as string).trim()
      : '');
  const message = messageRaw || null;
  // Bilan détaillé = champs texte structurés (hors message / observations / méta)
  const bilanFields = Object.entries(content).filter(
    ([k, v]) =>
      !['session_id', 'session_number', 'titre', 'observations', 'message du coach'].includes(k) &&
      typeof v !== 'object' &&
      v !== '' &&
      v !== null
  );

  const premium = canSeePremium(pack, session.session_number);
  const hasObs = !!observations && Object.keys(observations).length > 0;
  const hasBilan = bilanFields.length > 0;

  return (
    <div className="space-y-3">
      {/* Message du coach — inclus dans tous les packs */}
      {message && (
        <BilanCard title="Message du coach">
          <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{message}</p>
        </BilanCard>
      )}

      {/* Bilan du coach — premium (titre visible, contenu flouté si verrouillé) */}
      {hasBilan && (
        <BilanCard title="Bilan du coach">
          {premium ? (
            <div className="space-y-2">
              {bilanFields.map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-medium text-white">{fieldLabel(key)} : </span>
                  <span className="text-white/75">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <LockedText pack={pack} />
          )}
        </BilanCard>
      )}

      {/* Observations du coach — premium (verrouillé : couleurs + cercles visibles, chiffre flouté) */}
      {hasObs && (
        <BilanCard title="Observations du coach">
          {!premium && (
            <div className="mb-3">
              <UpgradeHintBar pack={pack} />
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.entries(observations!).map(([ind, note]) => (
              <div
                key={ind}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                <div
                  className={`flex flex-col items-center text-center gap-2 ${
                    premium ? '' : 'blur-[7px] select-none pointer-events-none'
                  }`}
                  aria-hidden={!premium}
                >
                  <ScoreGauge note={Number(note)} locked={!premium} />
                  <span className="text-[13px] font-semibold leading-snug text-white">{ind}</span>
                </div>
              </div>
            ))}
          </div>
        </BilanCard>
      )}
    </div>
  );
}

/* Lecteur de bilan — panneau latéral (≥ lg), scrollable avec en-tête collant */
function BilanPanel({
  session,
  report,
  pack,
  phaseLabel,
  fallbackTitle,
  onClose,
}: {
  session: OneToOneSession;
  report: Report | null;
  pack: Pack;
  phaseLabel: string;
  fallbackTitle: string | null;
  onClose: () => void;
}) {
  return (
    <div className="glass-navy rounded-2xl ring-1 ring-sage/40 max-h-[calc(100dvh-8rem)] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-start gap-3 p-6 pb-4 bg-navy-900/70 backdrop-blur-md border-b border-white/10">
        <span className="w-10 h-10 rounded-full bg-sage text-navy-900 flex items-center justify-center font-display font-semibold shrink-0">
          {session.session_number ?? '✓'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-white leading-tight">
            {session.title ?? fallbackTitle ?? 'Séance'}
          </h3>
          <p className="text-xs text-white/55 mt-0.5">
            {phaseLabel}
            {session.completed_at &&
              ` · Validée le ${new Date(session.completed_at).toLocaleDateString('fr-CA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer le bilan"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className="p-6 pt-4">
        <BilanDetails session={session} report={report} pack={pack} />
      </div>
    </div>
  );
}

/* État vide du lecteur — invite à sélectionner une séance */
function BilanReaderEmpty() {
  return (
    <div className="glass-navy rounded-2xl p-10 text-center border border-white/5">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-xl text-sun">
        ✉
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">Lecteur de bilan</h3>
      <p className="text-sm text-white/55">
        Sélectionne une séance validée à gauche pour lire le bilan rédigé par le coach.
      </p>
    </div>
  );
}
