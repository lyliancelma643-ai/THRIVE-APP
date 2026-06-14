'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { AssignedChild, CoachSession, childAge } from '@/lib/coach';
import { ageGroupFromBirthDate } from '@/lib/catalog';
import {
  getSessionScript,
  fillParentTemplate,
  SessionScript,
} from '@/lib/session-scripts';

type DraftState = {
  checks: Record<string, boolean>;
  ratings: Record<string, number>;
  fields: Record<string, string>;
  parentMsg: string;
  startedAt?: number | null;
};

// "0:05–0:20 — Bloc 1" -> plage en minutes [5, 20]
function parseTimeRange(title: string): [number, number] | null {
  const m = title.match(/^(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)/);
  if (!m) return null;
  return [
    parseInt(m[1]) * 60 + parseInt(m[2]),
    parseInt(m[3]) * 60 + parseInt(m[4]),
  ];
}

export default function CoachLiveSessionPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [child, setChild] = useState<AssignedChild | null>(null);
  const [session, setSession] = useState<CoachSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [parentMsg, setParentMsg] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const restoredRef = useRef(false);

  // Tic du chrono (1 s)
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const draftKey = `thrive-seance-${params?.sessionId}`;

  useEffect(() => {
    if (!params?.id || !params?.sessionId) return;
    (async () => {
      const [childRes, sessionRes] = await Promise.all([
        supabase
          .from('children')
          .select('id, first_name, last_name, date_of_birth, sport, family_id')
          .eq('id', params.id)
          .single(),
        supabase
          .from('sessions')
          .select('id, program_id, child_id, session_number, title, status, scheduled_at, completed_at, coach_notes')
          .eq('id', params.sessionId)
          .single(),
      ]);
      setChild((childRes.data ?? null) as AssignedChild | null);
      setSession((sessionRes.data ?? null) as CoachSession | null);
      setLoading(false);
    })();
  }, [params?.id, params?.sessionId]);

  const ageGroup = ageGroupFromBirthDate(child?.date_of_birth ?? null);
  const script: SessionScript | null = useMemo(
    () => getSessionScript(ageGroup, session?.session_number ?? null),
    [ageGroup, session?.session_number]
  );

  // Pré-remplissage du message parent + restauration du brouillon
  useEffect(() => {
    if (!script || !child || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const d: DraftState = JSON.parse(saved);
        setChecks(d.checks ?? {});
        setRatings(d.ratings ?? {});
        setFields(d.fields ?? {});
        setStartedAt(d.startedAt ?? null);
        setParentMsg(
          d.parentMsg ||
            fillParentTemplate(
              script.parentTemplate,
              child.first_name,
              `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
            )
        );
        return;
      }
    } catch {
      /* brouillon illisible : on repart du modèle */
    }
    setParentMsg(
      fillParentTemplate(
        script.parentTemplate,
        child.first_name,
        `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
      )
    );
  }, [script, child, user, draftKey]);

  // Sauvegarde automatique du brouillon (rien ne se perd)
  useEffect(() => {
    if (!restoredRef.current) return;
    const d: DraftState = { checks, ratings, fields, parentMsg, startedAt };
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(d));
      } catch {
        /* stockage plein : tant pis pour le brouillon */
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [checks, ratings, fields, parentMsg, startedAt, draftKey]);

  const ratedCount = Object.values(ratings).filter((v) => v > 0).length;
  const elapsedSec = startedAt ? Math.max(0, Math.floor((nowTick - startedAt) / 1000)) : 0;
  const elapsedMin = elapsedSec / 60;
  const timerLabel = `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`;

  // Étapes minutées de la séance (pour la navigation rapide)
  const steps = useMemo(() => {
    if (!script) return [];
    return script.blocks
      .map((b, bi) => {
        if (b.t !== 'section' || b.level !== 2) return null;
        const range = parseTimeRange(b.title);
        if (!range) return null;
        const label = b.title.split('—')[0].trim();
        return { bi, range, label };
      })
      .filter(Boolean) as { bi: number; range: [number, number]; label: string }[];
  }, [script]);

  const currentStep = startedAt
    ? steps.find((s) => elapsedMin >= s.range[0] && elapsedMin < s.range[1]) ?? null
    : null;

  const jumpTo = (bi: number) => {
    document.getElementById(`sec-${bi}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const send = useCallback(async () => {
    if (!user?.id || !child || !session) return;
    setSending(true);
    setError('');
    try {
      // 1. La séance passe « validée » (s'éclaire chez le parent)
      const { error: upErr } = await supabase
        .from('sessions')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          coach_notes: parentMsg,
        })
        .eq('id', session.id);
      if (upErr) throw upErr;

      // 2. Bilan complet -> compte parent (grille + réponses + message)
      const observations: Record<string, number> = {};
      Object.entries(ratings).forEach(([key, v]) => {
        if (v > 0) observations[key.split('|').slice(1).join('|')] = v;
      });
      const filledFields = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v.trim() !== '')
      );

      const { error: repErr } = await supabase.from('reports').insert({
        child_id: child.id,
        program_id: session.program_id,
        generated_by: user.id,
        content: {
          session_id: session.id,
          session_number: session.session_number,
          titre: session.title,
          'message du coach': parentMsg,
          ...(Object.keys(observations).length > 0 ? { observations } : {}),
          ...filledFields,
        },
      });
      if (repErr) throw repErr;

      localStorage.removeItem(draftKey);
      router.push(`/coach/athletes/${child.id}?sent=1`);
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi du bilan");
      setSending(false);
    }
  }, [user, child, session, parentMsg, ratings, fields, draftKey, router]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-navy-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!child || !session) {
    return <p className="text-navy-600">Séance introuvable ou athlète non assigné.</p>;
  }

  if (!script) {
    return (
      <p className="text-navy-600">
        Fiche de séance indisponible pour cette tranche d&apos;âge.
      </p>
    );
  }

  const isDone = session.status === 'COMPLETED';

  return (
    <div className="max-w-3xl pb-44 lg:pb-28">
      {/* En-tête */}
      <Link
        href={`/coach/athletes/${child.id}`}
        className="text-sm text-navy-600/70 hover:text-navy-900"
      >
        ← {child.first_name}
      </Link>
      <div className="mt-3 mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy-600/60 mb-1">
          Séance {session.session_number} · {ageGroup} ans ({childAge(child.date_of_birth)} ans) ·{' '}
          {session.scheduled_at &&
            new Date(session.scheduled_at).toLocaleDateString('fr-CA', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
        </p>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-navy-900">
          {script.title || session.title}
        </h1>
        {isDone && (
          <p className="mt-2 inline-block px-3 py-1 rounded-full bg-sage text-navy-900 text-xs font-bold">
            Séance déjà validée — le bilan a été envoyé au parent
          </p>
        )}
      </div>

      {error && <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {/* Chrono de séance */}
      {!isDone && !startedAt && (
        <button
          onClick={() => setStartedAt(Date.now())}
          className="w-full mb-4 py-4 rounded-2xl bg-navy-600 hover:bg-navy-700 text-white font-bold text-base transition-colors"
        >
          ▶ Commencer la séance — le chrono guide le déroulé
        </button>
      )}

      {/* Navigation rapide entre les étapes minutées */}
      {steps.length > 1 && (
        <div className="sticky top-2 lg:top-2 z-30 -mx-1 mb-4">
          <div className="glass-strong rounded-full px-2 py-1.5 flex gap-1 overflow-x-auto scrollbar-hide">
            {steps.map((s) => {
              const isCurrent = currentStep?.bi === s.bi;
              return (
                <button
                  key={s.bi}
                  onClick={() => jumpTo(s.bi)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'bg-sun text-navy-900'
                      : 'text-navy-700 hover:bg-white/70'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Déroulé interactif de la séance */}
      <div className="space-y-3">
        {script.blocks.map((b, bi) => {
          switch (b.t) {
            case 'section': {
              const range = parseTimeRange(b.title);
              const isCurrent =
                !!startedAt && !!range && elapsedMin >= range[0] && elapsedMin < range[1];
              return (
                <h2
                  key={bi}
                  id={`sec-${bi}`}
                  className={`font-display font-semibold pt-5 scroll-mt-20 flex flex-wrap items-center gap-2 ${
                    b.level === 2 ? 'text-xl' : 'text-base'
                  } ${isCurrent ? 'text-navy-900' : 'text-navy-900/80'}`}
                >
                  {b.title}
                  {isCurrent && (
                    <span className="px-2.5 py-1 rounded-full bg-sun text-navy-900 text-[11px] font-bold animate-pulse">
                      ⏱ EN COURS
                    </span>
                  )}
                </h2>
              );
            }
            case 'callout':
              return (
                <div
                  key={bi}
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    b.icon === '⚠️'
                      ? 'bg-sun/30 text-navy-900'
                      : 'bg-navy-900 text-white'
                  }`}
                >
                  {b.icon} {b.text}
                </div>
              );
            case 'verbatim':
              return (
                <div
                  key={bi}
                  className="p-4 rounded-2xl bg-sage/25 border-l-4 border-sage text-navy-900 text-sm italic"
                >
                  💬 « {b.text} »
                </div>
              );
            case 'chips':
              return (
                <div key={bi} className="flex flex-wrap gap-2">
                  {b.items.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 rounded-full bg-white shadow-card text-sm text-navy-900"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              );
            case 'checklist':
              return (
                <div key={bi} className="space-y-1.5">
                  {b.items.map((item, ii) => {
                    const k = `${bi}-${ii}`;
                    const on = !!checks[k];
                    return (
                      <label
                        key={k}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          on ? 'bg-sage/30' : 'bg-white shadow-card hover:bg-navy-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => setChecks((c) => ({ ...c, [k]: !on }))}
                          className="mt-0.5 w-4 h-4 accent-navy-600 shrink-0"
                        />
                        <span className={`text-sm ${on ? 'text-navy-900' : 'text-navy-900/80'}`}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              );
            case 'grid':
              return (
                <div key={bi} className="p-4 rounded-2xl bg-white shadow-card space-y-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-navy-600/60">
                    Grille d&apos;observation — 1 fragile · 5 solide
                  </span>
                  {b.items.map((ind) => {
                    const k = `${bi}|${ind}`;
                    return (
                      <div key={k} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-navy-900 flex-1">{ind}</span>
                        <span className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setRatings((r) => ({ ...r, [k]: r[k] === n ? 0 : n }))
                              }
                              className={`w-9 h-9 md:w-7 md:h-7 rounded-full text-sm md:text-xs font-bold transition-colors ${
                                (ratings[k] ?? 0) >= n
                                  ? 'bg-navy-600 text-white'
                                  : 'bg-navy-50 text-navy-400 hover:bg-navy-100'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            case 'field':
              return (
                <label key={bi} className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-navy-600/70 mb-1">
                    ✏️ {b.label}
                  </span>
                  <textarea
                    rows={2}
                    value={fields[b.label] ?? ''}
                    onChange={(e) => setFields((f) => ({ ...f, [b.label]: e.target.value }))}
                    placeholder={b.hint || 'Noter ici…'}
                    className="w-full border border-navy-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-navy-600"
                  />
                </label>
              );
            default:
              return (
                <p key={bi} className="text-sm text-navy-900/75 whitespace-pre-line leading-relaxed">
                  {b.text}
                </p>
              );
          }
        })}
      </div>

      {/* Message aux parents */}
      <div className="mt-10 p-5 rounded-2xl bg-navy-900 text-white">
        <h2 className="font-display text-lg mb-1">📩 Message bilan pour les parents</h2>
        <p className="text-xs text-navy-100/70 mb-3">
          Pré-rempli depuis la méthode avec le prénom de {child.first_name} — personnalisez
          les passages « … » puis envoyez.
        </p>
        <textarea
          rows={12}
          value={parentMsg}
          onChange={(e) => setParentMsg(e.target.value)}
          className="w-full rounded-xl bg-navy-800 border border-navy-700 text-sm text-white p-3 focus:outline-sun"
        />
      </div>

      {/* Barre d'envoi */}
      <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 left-0 lg:left-64 right-0 z-40 px-4 py-3 lg:px-10 lg:py-4 bg-cream/85 backdrop-blur-xl border-t border-navy-100">
        <div className="max-w-3xl flex items-center gap-3">
          {startedAt && !isDone && (
            <button
              onClick={() => currentStep && jumpTo(currentStep.bi)}
              title="Aller à l'étape en cours"
              className="px-3 py-1.5 rounded-full bg-navy-900 text-sun text-sm font-bold tabular-nums shrink-0"
            >
              ⏱ {timerLabel}
              {currentStep && <span className="ml-1.5 text-[10px] text-sage">↓ {currentStep.label}</span>}
            </button>
          )}
          <span className="hidden sm:inline text-xs text-navy-600/70">
            {ratedCount} indicateur{ratedCount > 1 ? 's' : ''} coté{ratedCount > 1 ? 's' : ''} ·{' '}
            {Object.values(fields).filter((v) => v.trim()).length} notes · brouillon auto
          </span>
          <button
            onClick={send}
            disabled={sending || !parentMsg.trim()}
            className="ml-auto px-4 py-3 lg:px-6 rounded-full bg-navy-600 hover:bg-navy-700 text-white text-sm font-bold disabled:opacity-50 whitespace-nowrap"
          >
            {sending
              ? 'Envoi…'
              : isDone
                ? 'Renvoyer le bilan'
                : 'Terminer & envoyer le bilan'}
          </button>
        </div>
      </div>
    </div>
  );
}
