'use client';

// Questionnaire LSSS — page enfant, accessible via lien dédié tokenisé (aucune
// authentification requise). Charge et soumet via les RPC SECURITY DEFINER
// lsss_get / lsss_submit (accessibles à anon).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseClient as supabase } from '@thrive/shared';

type Item = {
  id: string;
  subscale: string;
  subscale_label: string;
  prompt: string;
  sort_order: number;
};

type LoadState = {
  questionnaire_id?: string;
  child_first_name?: string;
  title?: string;
  description?: string;
  moment?: string;
  status?: string;
  completed?: boolean;
  items?: Item[];
  error?: string;
};

const SCALE = [
  { v: 1, label: 'Pas du tout' },
  { v: 2, label: 'Un peu' },
  { v: 3, label: 'Moyennement' },
  { v: 4, label: 'Beaucoup' },
  { v: 5, label: 'Tout à fait' },
];

export default function LsssQuestionnairePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [state, setState] = useState<LoadState | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc('lsss_get', { p_token: token });
    if (error) {
      setState({ error: error.message });
      return;
    }
    setState(data as LoadState);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const items = state?.items ?? [];
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.subscale_label) ?? [];
      arr.push(it);
      map.set(it.subscale_label, arr);
    }
    return Array.from(map.entries());
  }, [state]);

  const total = state?.items?.length ?? 0;
  const answered = Object.keys(answers).length;
  const allAnswered = total > 0 && answered >= total;

  const submit = async () => {
    if (!token || !allAnswered) return;
    setSubmitting(true);
    setSubmitError('');
    const { data, error } = await supabase.rpc('lsss_submit', { p_token: token, p_answers: answers });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    if ((data as any)?.error) {
      setSubmitError(
        (data as any).error === 'incomplete'
          ? 'Merci de répondre à toutes les questions.'
          : (data as any).error === 'already_completed'
          ? 'Ce questionnaire a déjà été complété.'
          : 'Une erreur est survenue.'
      );
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── États d'écran ──────────────────────────────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(125% 85% at 50% -12%, #0a3a44 0%, #06303a 24%, #042430 52%, #03161b 100%)',
        color: '#eaf3f1',
        fontFamily: "'Inter',system-ui,sans-serif",
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );

  if (!state) {
    return (
      <Shell>
        <div style={{ height: 200, display: 'grid', placeItems: 'center', opacity: 0.6 }}>Chargement…</div>
      </Shell>
    );
  }

  if (state.error || done || state.completed) {
    const msg = done
      ? 'Merci ! Tes réponses ont bien été enregistrées. 🎉'
      : state.completed
      ? 'Ce questionnaire a déjà été complété. Merci !'
      : state.error === 'expired'
      ? 'Ce lien a expiré. Demande un nouveau lien à ton coach.'
      : 'Lien invalide ou introuvable.';
    return (
      <Shell>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{done || state.completed ? '✅' : '⚠️'}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            {done || state.completed ? 'C’est fait' : 'Oups'}
          </h1>
          <p style={{ opacity: 0.7, lineHeight: 1.5 }}>{msg}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: '#A7C4BC' }}>
          THRIVE · LSSS
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 8px' }}>
          Salut {state.child_first_name} 👋
        </h1>
        <p style={{ opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>
          {state.description ??
            'Réponds en pensant à ton sport. Il n’y a pas de bonne ou de mauvaise réponse.'}
        </p>
      </header>

      {/* Barre de progression */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          padding: '10px 0',
          background: 'linear-gradient(180deg,#042430,rgba(4,36,48,0))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ opacity: 0.7 }}>
            {answered}/{total} réponses
          </span>
          <span style={{ color: '#F9EB50' }}>{total ? Math.round((answered / total) * 100) : 0}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${total ? (answered / total) * 100 : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg,#A7C4BC,#F9EB50)',
              transition: 'width .3s ease',
            }}
          />
        </div>
      </div>

      {/* Questions groupées par sous-échelle */}
      {grouped.map(([label, items]) => (
        <section key={label} style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#A7C4BC', marginBottom: 10 }}>{label}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <p style={{ fontSize: 14, marginBottom: 12, lineHeight: 1.4 }}>{it.prompt}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SCALE.map((s) => {
                    const active = answers[it.id] === s.v;
                    return (
                      <button
                        key={s.v}
                        onClick={() => setAnswers((a) => ({ ...a, [it.id]: s.v }))}
                        style={{
                          flex: 1,
                          minHeight: 52,
                          borderRadius: 12,
                          border: active ? '1px solid #F9EB50' : '1px solid rgba(255,255,255,.12)',
                          background: active ? 'rgba(249,235,80,.18)' : 'rgba(255,255,255,.03)',
                          color: active ? '#F9EB50' : 'rgba(234,243,241,.8)',
                          fontWeight: 700,
                          fontSize: 16,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                        aria-label={s.label}
                      >
                        {s.v}
                        <span style={{ fontSize: 8, fontWeight: 500, opacity: 0.7, lineHeight: 1 }}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {submitError && (
        <p style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'rgba(220,80,80,.15)', color: '#ffb4b4', fontSize: 14 }}>
          {submitError}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!allAnswered || submitting}
        style={{
          marginTop: 24,
          width: '100%',
          minHeight: 54,
          borderRadius: 16,
          border: 'none',
          background: allAnswered ? '#F9EB50' : 'rgba(255,255,255,.1)',
          color: allAnswered ? '#06222a' : 'rgba(234,243,241,.4)',
          fontWeight: 700,
          fontSize: 16,
          cursor: allAnswered ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Envoi…' : allAnswered ? 'Envoyer mes réponses' : `Encore ${total - answered} question(s)`}
      </button>
      <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.4, marginTop: 14 }}>
        Tes réponses sont partagées avec ton coach pour t&apos;aider à progresser.
      </p>
    </Shell>
  );
}
