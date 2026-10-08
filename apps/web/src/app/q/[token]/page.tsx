'use client';

// Questionnaire enfant — page accessible via lien dédié tokenisé (aucune
// authentification requise). Gère LSSS *et* PERMA (dispatch par `kind`) et deux
// langues (fr/en, dictée par le questionnaire). Charge et soumet via les RPC
// SECURITY DEFINER questionnaire_get / questionnaire_submit (accessibles à anon).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient as supabase } from '@thrive/shared';

type Item = {
  id: string;
  group_key: string;
  group_label: string;
  prompt: string;
  sort_order: number;
};

type LoadState = {
  questionnaire_id?: string;
  kind?: 'LSSS' | 'PERMA';
  lang?: 'fr' | 'en';
  session_number?: number | null;
  moment?: string | null;
  child_first_name?: string;
  title?: string;
  description?: string;
  status?: string;
  completed?: boolean;
  items?: Item[];
  error?: string;
};

type Lang = 'fr' | 'en';

// EPOCH (kind PERMA) = échelle de fréquence officielle (Kern et al. 2016) ;
// LSSS = échelle d'accord. Sélection selon le type de questionnaire.
const SCALE: Record<'PERMA' | 'LSSS', Record<Lang, { v: number; label: string }[]>> = {
  PERMA: {
    fr: [
      { v: 1, label: 'Presque jamais' },
      { v: 2, label: 'Parfois' },
      { v: 3, label: 'Souvent' },
      { v: 4, label: 'Très souvent' },
      { v: 5, label: 'Presque toujours' },
    ],
    en: [
      { v: 1, label: 'Almost never' },
      { v: 2, label: 'Sometimes' },
      { v: 3, label: 'Often' },
      { v: 4, label: 'Very often' },
      { v: 5, label: 'Almost always' },
    ],
  },
  LSSS: {
    fr: [
      { v: 1, label: 'Pas du tout' },
      { v: 2, label: 'Un peu' },
      { v: 3, label: 'Moyennement' },
      { v: 4, label: 'Beaucoup' },
      { v: 5, label: 'Tout à fait' },
    ],
    en: [
      { v: 1, label: 'Not at all' },
      { v: 2, label: 'A little' },
      { v: 3, label: 'Somewhat' },
      { v: 4, label: 'A lot' },
      { v: 5, label: 'Completely' },
    ],
  },
};

type Tr = {
  loading: string;
  hi: string;
  defaultDesc: string;
  answers: string;
  done: string;
  oops: string;
  thanks: string;
  already: string;
  expired: string;
  invalid: string;
  home: string;
  send: string;
  sending: string;
  remaining: (n: number) => string;
  incomplete: string;
  alreadyShort: string;
  genericErr: string;
  footer: string;
  session: string;
  question: (i: number, n: number) => string;
  prev: string;
  next: string;
  saved: string;
  review: string;
};

const T: Record<Lang, Tr> = {
  fr: {
    loading: 'Chargement…',
    hi: 'Salut',
    defaultDesc: 'Réponds en pensant à ton sport. Il n’y a pas de bonne ou de mauvaise réponse.',
    answers: 'réponses',
    done: 'C’est fait',
    oops: 'Oups',
    thanks: 'Merci ! Tes réponses ont bien été enregistrées.',
    already: 'Ce questionnaire a déjà été complété. Merci !',
    expired: 'Ce lien a expiré. Demande un nouveau lien à ton coach.',
    invalid: 'Lien invalide ou introuvable.',
    home: 'Terminer',
    send: 'Envoyer mes réponses',
    sending: 'Envoi…',
    remaining: (n: number) => (n > 1 ? `Encore ${n} questions` : 'Encore 1 question'),
    incomplete: 'Merci de répondre à toutes les questions.',
    alreadyShort: 'Ce questionnaire a déjà été complété.',
    genericErr: 'Une erreur est survenue.',
    footer: 'Tes réponses sont partagées avec ton coach pour t’aider à progresser.',
    session: 'Séance',
    question: (i: number, n: number) => `Question ${i} sur ${n}`,
    prev: 'Précédente',
    next: 'Suivante',
    saved: 'Tes réponses sont gardées sur cet appareil : tu peux finir plus tard.',
    review: 'Tout est répondu !',
  },
  en: {
    loading: 'Loading…',
    hi: 'Hi',
    defaultDesc: 'Answer thinking about your sport. There are no right or wrong answers.',
    answers: 'answers',
    done: 'All done',
    oops: 'Oops',
    thanks: 'Thank you! Your answers have been saved.',
    already: 'This questionnaire has already been completed. Thank you!',
    expired: 'This link has expired. Ask your coach for a new one.',
    invalid: 'Invalid or missing link.',
    home: 'Finish',
    send: 'Send my answers',
    sending: 'Sending…',
    remaining: (n: number) => (n > 1 ? `${n} questions left` : '1 question left'),
    incomplete: 'Please answer every question.',
    alreadyShort: 'This questionnaire has already been completed.',
    genericErr: 'Something went wrong.',
    footer: 'Your answers are shared with your coach to help you progress.',
    session: 'Session',
    question: (i: number, n: number) => `Question ${i} of ${n}`,
    prev: 'Previous',
    next: 'Next',
    saved: 'Your answers are kept on this device: you can finish later.',
    review: 'All answered!',
  },
};

// Palette : PERMA (bien-être, tons chauds) vs LSSS (turquoise) — accent commun jaune.
const ACCENT = '#F9EB50';
const INK = '#06222a';

// Hors du composant : défini dedans, il serait recréé à chaque rendu (perte du
// focus et de l'animation à chaque réponse).
function Shell({ perma, children }: { perma: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: perma
          ? 'radial-gradient(125% 85% at 50% -12%, #3a2a10 0%, #2e2410 24%, #241a08 52%, #140e04 100%)'
          : 'radial-gradient(125% 85% at 50% -12%, #0a3a44 0%, #06303a 24%, #042430 52%, #03161b 100%)',
        color: '#eaf3f1',
        fontFamily: "'Inter',system-ui,sans-serif",
        padding: 'max(24px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

const draftKey = (token: string) => `thrive.q.${token}`;

export default function QuestionnairePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const queryClient = useQueryClient();

  const [state, setState] = useState<LoadState | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const advanceTimer = useRef<number>(0);
  const questionRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const { data, error } = await supabase.rpc('questionnaire_get', { p_token: token });
    if (error) {
      setState({ error: error.message });
      return;
    }
    setState(data as LoadState);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const lang: Lang = state?.lang === 'en' ? 'en' : 'fr';
  const tr = T[lang];
  const isPerma = state?.kind === 'PERMA';
  const groupColor = isPerma ? '#F6B45A' : '#A7C4BC';

  // Ordre d'affichage : par groupe (pilier PERMA ou sous-échelle LSSS), comme avant.
  const items = useMemo(() => {
    const list = state?.items ?? [];
    const map = new Map<string, Item[]>();
    for (const it of list) {
      const arr = map.get(it.group_label) ?? [];
      arr.push(it);
      map.set(it.group_label, arr);
    }
    return Array.from(map.values()).flat();
  }, [state]);

  const total = items.length;
  const answered = items.filter((it) => answers[it.id] !== undefined).length;
  const allAnswered = total > 0 && answered >= total;
  const firstMissing = items.findIndex((it) => answers[it.id] === undefined);

  // Brouillon : les réponses survivent à un rechargement ou à un téléphone verrouillé.
  useEffect(() => {
    if (!token || !total) return;
    try {
      const raw = window.localStorage.getItem(draftKey(token));
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, number>;
      const valid = Object.fromEntries(
        Object.entries(saved).filter(([id, v]) => items.some((it) => it.id === id) && Number.isInteger(v))
      );
      setAnswers(valid);
      const next = items.findIndex((it) => valid[it.id] === undefined);
      setIndex(next < 0 ? total : next);
    } catch {
      /* stockage indisponible : on repart de zéro */
    }
    // À l'arrivée des questions seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, total]);

  useEffect(() => {
    if (!token || done) return;
    try {
      if (Object.keys(answers).length) window.localStorage.setItem(draftKey(token), JSON.stringify(answers));
    } catch {
      /* ignore */
    }
  }, [answers, token, done]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Le focus suit la question affichée (lecteurs d'écran, clavier).
  useEffect(() => {
    questionRef.current?.focus({ preventScroll: true });
  }, [index]);

  const choose = (itemId: string, v: number) => {
    setAnswers((a) => ({ ...a, [itemId]: v }));
    window.clearTimeout(advanceTimer.current);
    // Petit temps pour voir son choix, puis question suivante sans réponse.
    advanceTimer.current = window.setTimeout(() => {
      setIndex((i) => {
        const after = items.findIndex((it, j) => j > i && answers[it.id] === undefined && it.id !== itemId);
        if (after >= 0) return after;
        const before = items.findIndex((it) => answers[it.id] === undefined && it.id !== itemId);
        return before >= 0 ? before : total;
      });
    }, 260);
  };

  const submit = async () => {
    if (!token || !allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const { data, error } = await supabase.rpc('questionnaire_submit', { p_token: token, p_answers: answers });
    setSubmitting(false);
    if (error) {
      setSubmitError(/fetch|network/i.test(error.message) ? tr.genericErr : error.message);
      return;
    }
    if ((data as any)?.error) {
      const code = (data as any).error;
      setSubmitError(
        code === 'incomplete'
          ? tr.incomplete
          : code === 'already_completed'
          ? tr.alreadyShort
          : tr.genericErr
      );
      return;
    }
    try {
      window.localStorage.removeItem(draftKey(token));
    } catch {
      /* ignore */
    }
    setDone(true);
    // Le parent revient souvent au bilan juste après (flux notification →
    // /q/<token> → bilan) : on invalide le cache partagé pour que la courbe
    // EPOCH et la jauge LSSS intègrent la séance sans attendre l'expiration.
    queryClient.invalidateQueries({ queryKey: ['bilan'] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!state) {
    return (
      <Shell perma={false}>
        <div role="status" style={{ height: 200, display: 'grid', placeItems: 'center', opacity: 0.75 }}>{T.fr.loading}</div>
      </Shell>
    );
  }

  if (state.error || done || state.completed) {
    const ok = done || state.completed;
    const msg = done ? tr.thanks : state.completed ? tr.already : state.error === 'expired' ? tr.expired : tr.invalid;
    return (
      <Shell perma={isPerma}>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div
            aria-hidden
            style={{
              width: 72,
              height: 72,
              margin: '0 auto 20px',
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: ok ? 'rgba(167,196,188,.18)' : 'rgba(249,235,80,.12)',
              color: ok ? '#A7C4BC' : ACCENT,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {ok ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M12 7v6m0 4h.01" />}
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>{ok ? tr.done : tr.oops}</h1>
          <p style={{ opacity: 0.85, fontSize: 17, lineHeight: 1.5, marginBottom: 28 }}>{msg}</p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 52,
              padding: '0 28px',
              borderRadius: 16,
              background: ACCENT,
              color: INK,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            {tr.home}
          </Link>
        </div>
      </Shell>
    );
  }

  const kindLabel = isPerma
    ? `THRIVE · EPOCH${state.session_number ? ` · ${tr.session} ${state.session_number}` : ''}`
    : 'THRIVE · LSSS';
  const atEnd = index >= total;
  const item = atEnd ? null : items[index];
  const scale = SCALE[isPerma ? 'PERMA' : 'LSSS'][lang];

  return (
    <Shell perma={isPerma}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: groupColor }}>{kindLabel}</p>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 8px' }}>
          {tr.hi} {state.child_first_name}
        </h1>
        {index === 0 && answered === 0 && (
          <p style={{ opacity: 0.85, fontSize: 16, lineHeight: 1.5 }}>{state.description ?? tr.defaultDesc}</p>
        )}
      </header>

      {/* Progression */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
          <span style={{ opacity: 0.85 }}>{atEnd ? tr.review : tr.question(index + 1, total)}</span>
          <span style={{ color: ACCENT, fontWeight: 700 }}>
            {answered}/{total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          aria-label={`${answered} / ${total} ${tr.answers}`}
          style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${total ? (answered / total) * 100 : 0}%`,
              height: '100%',
              background: `linear-gradient(90deg,${groupColor},${ACCENT})`,
              transition: 'width .3s ease',
            }}
          />
        </div>
      </div>

      {item ? (
        <section key={item.id} aria-labelledby={`q-${item.id}`} style={{ animation: 'om-up .32s cubic-bezier(.2,.7,.2,1) both' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: groupColor, marginBottom: 8 }}>{item.group_label}</p>
          <h2
            id={`q-${item.id}`}
            ref={questionRef}
            tabIndex={-1}
            style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.35, marginBottom: 20, outline: 'none' }}
          >
            {item.prompt}
          </h2>
          <div role="radiogroup" aria-labelledby={`q-${item.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scale.map((sc) => {
              const active = answers[item.id] === sc.v;
              return (
                <button
                  key={sc.v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choose(item.id, sc.v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    minHeight: 58,
                    padding: '0 16px',
                    borderRadius: 16,
                    border: active ? `2px solid ${ACCENT}` : '1px solid rgba(255,255,255,.16)',
                    background: active ? 'rgba(249,235,80,.16)' : 'rgba(255,255,255,.05)',
                    color: active ? ACCENT : '#eaf3f1',
                    fontSize: 18,
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 15,
                      fontWeight: 700,
                      background: active ? ACCENT : 'rgba(255,255,255,.08)',
                      color: active ? INK : 'rgba(234,243,241,.85)',
                    }}
                  >
                    {sc.v}
                  </span>
                  {sc.label}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{tr.review}</p>
        </section>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, gap: 12 }}>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, Math.min(i, total) - 1))}
          disabled={index === 0}
          style={{
            minHeight: 48,
            padding: '0 6px',
            background: 'none',
            border: 'none',
            color: 'rgba(234,243,241,.85)',
            fontSize: 15,
            fontWeight: 600,
            cursor: index === 0 ? 'default' : 'pointer',
            opacity: index === 0 ? 0.35 : 1,
          }}
        >
          ← {tr.prev}
        </button>
        {!atEnd && answers[item!.id] !== undefined && (
          <button
            type="button"
            onClick={() => setIndex((i) => (firstMissing >= 0 && firstMissing !== i ? firstMissing : Math.min(total, i + 1)))}
            style={{ minHeight: 48, padding: '0 6px', background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            {tr.next} →
          </button>
        )}
      </div>

      {submitError && (
        <p role="alert" style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'rgba(220,80,80,.15)', color: '#ffb4b4', fontSize: 15 }}>
          {submitError}
        </p>
      )}

      {(atEnd || allAnswered) && (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered || submitting}
          style={{
            marginTop: 20,
            width: '100%',
            minHeight: 56,
            borderRadius: 16,
            border: 'none',
            background: allAnswered ? ACCENT : 'rgba(255,255,255,.1)',
            color: allAnswered ? INK : 'rgba(234,243,241,.6)',
            fontWeight: 700,
            fontSize: 17,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? tr.sending : allAnswered ? tr.send : tr.remaining(total - answered)}
        </button>
      )}
      {atEnd && !allAnswered && firstMissing >= 0 && (
        <button
          type="button"
          onClick={() => setIndex(firstMissing)}
          style={{ marginTop: 10, width: '100%', minHeight: 48, background: 'none', border: 'none', color: ACCENT, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {tr.remaining(total - answered)} →
        </button>
      )}

      <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.7, marginTop: 22, lineHeight: 1.5 }}>
        {answered > 0 && !allAnswered ? `${tr.saved} ` : ''}
        {tr.footer}
      </p>
    </Shell>
  );
}
