'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { useAccessStore } from '@/lib/access';
import { SessionsLockedNotice } from '@/components/parent/AccessGate';
import { BilanCard, LockedText, ScoreGauge, UpgradeHintBar } from '@/components/parent/PackGate';
import { PHASE_LABELS, Phase } from '@/lib/catalog';
import { THRIVE_SESSIONS } from '@/lib/coach';
import { usePlan } from '@/lib/entitlements';
import { type Pack } from '@/lib/packs';
import { useModalDismiss } from '@/lib/useModalDismiss';

type OneToOneSession = {
  id: string;
  session_number: number | null;
  title: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  scheduled_at: string | null;
  completed_at: string | null;
  coach_notes: string | null;
};

// Bilan de séance servi par le RPC filtré `session_report` (migration 039) :
// le message arrive toujours, le bilan détaillé et les notes d'observations
// uniquement si le pack le permet — le serveur n'expose jamais le reste.
type SessionBilan = {
  session_id: string;
  session_number: number | null;
  premium: boolean;
  message: string | null;
  has_bilan: boolean;
  has_observations: boolean;
  bilan: Record<string, unknown> | null;
  observations: Record<string, number> | null;
  observation_labels: string[] | null;
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

function MySessionsPageInner() {
  const { children, selectedChildId, isLoading: childrenLoading } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [sessions, setSessions] = useState<OneToOneSession[]>([]);
  const [bilans, setBilans] = useState<Record<string, SessionBilan>>({});
  const [coach, setCoach] = useState<CoachInfo>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Droits du forfait de la famille — source unique côté client (matrice packs.ts)
  const { pack } = usePlan(selectedChildId);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setSessions([]);
      setBilans({});
      setCoach(null);
      setLoading(false);
      return;
    }
    const [sessionsRes, assignmentRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, session_number, title, status, scheduled_at, completed_at, coach_notes')
        .eq('child_id', selectedChildId)
        .order('session_number', { ascending: true, nullsFirst: false }),
      supabase
        .from('coach_assignments')
        .select('coach_id, profiles:coach_id (first_name, last_name)')
        .eq('child_id', selectedChildId)
        .eq('is_active', true)
        .limit(1),
    ]);

    const loadedSessions = (sessionsRes.data ?? []) as OneToOneSession[];
    setSessions(loadedSessions);

    // Bilan filtré côté serveur pour chaque séance validée (jamais de lecture brute)
    const completed = loadedSessions.filter((s) => s.status === 'COMPLETED');
    const entries = await Promise.all(
      completed.map(async (s) => {
        const { data } = await supabase.rpc('session_report', { p_session: s.id });
        return [s.id, (data as SessionBilan | null) ?? null] as const;
      })
    );
    setBilans(Object.fromEntries(entries.filter(([, b]) => b !== null)) as Record<string, SessionBilan>);

    const assignment = (assignmentRes.data ?? [])[0] as any;
    const coachProfile = Array.isArray(assignment?.profiles)
      ? assignment.profiles[0]
      : assignment?.profiles;
    setCoach((coachProfile as CoachInfo) ?? null);
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
  const selectedBilan = selectedSession ? bilans[selectedSession.id] ?? null : null;
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
          const bilan = isDone && s ? bilans[s.id] ?? null : null;
          const rowId = s?.id ?? `tpl-${tpl.num}`;
          const isSelected = selectedId === rowId;
          const hasDetails = Boolean(
            bilan && (bilan.message || bilan.has_bilan || bilan.has_observations)
          );

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
                  <BilanDetails bilan={bilan} pack={pack} />
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
              bilan={selectedBilan}
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

function fieldLabel(key: string): string {
  if (key === 'message du coach') return 'Message du coach';
  const k = key.replace(/_/g, ' ').trim();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

/* Corps du bilan — 3 sections servies par le RPC filtré `session_report` ;
   partagé entre la lecture inline (mobile) et le panneau latéral (desktop).
   Message → tous les packs · Bilan détaillé + Observations → Performance (toutes
   les séances) / Avancé (séances 3, 7, 13) / Essentiel (verrouillé).
   Verrouillé : le serveur n'envoie que les libellés — les notes n'atteignent
   jamais le client (le flou n'est plus un simple voile cosmétique). */
function BilanDetails({ bilan, pack }: { bilan: SessionBilan | null; pack: Pack }) {
  const premium = bilan?.premium ?? false;
  const message = bilan?.message ?? null;
  const bilanFields = Object.entries(bilan?.bilan ?? {});
  const observations = bilan?.observations ?? null;
  // Grille des observations : notes réelles si premium, sinon libellés seuls
  // (jauge neutre floutée — aucune donnée réelle).
  const obsEntries: [string, number][] = premium
    ? Object.entries(observations ?? {}).map(([k, v]) => [k, Number(v)])
    : (bilan?.observation_labels ?? []).map((label) => [label, 3]);
  const hasBilan = bilan?.has_bilan ?? false;
  const hasObs = bilan?.has_observations ?? false;

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
            {obsEntries.map(([ind, note]) => (
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
                  <ScoreGauge note={note} locked={!premium} />
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
  bilan,
  pack,
  phaseLabel,
  fallbackTitle,
  onClose,
}: {
  session: OneToOneSession;
  bilan: SessionBilan | null;
  pack: Pack;
  phaseLabel: string;
  fallbackTitle: string | null;
  onClose: () => void;
}) {
  // Panneau (non plein écran) : Échap le referme, en plus du bouton ✕ et du
  // re-clic sur la séance. Pas de verrou de scroll (le reste reste utilisable).
  useModalDismiss(onClose, true, false);
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
        <BilanDetails bilan={bilan} pack={pack} />
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


// ── Garde d'accès : message d'attente tant que le coach n'a pas validé ───────
export default function MySessionsPage() {
  const { access, isLoading, refresh } = useAccessStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isLoading || !access) {
    return <div className="h-40 rounded-2xl bg-white/[0.05] animate-pulse" aria-hidden />;
  }
  if (!access.unlocked) return <SessionsLockedNotice />;
  return <MySessionsPageInner />;
}
