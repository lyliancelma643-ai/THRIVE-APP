'use client';

// Questionnaire enfant — page accessible via lien dédié tokenisé (aucune
// authentification requise). Gère LSSS *et* PERMA (dispatch par `kind`) et deux
// langues (fr/en, dictée par le questionnaire). Charge et soumet via les RPC
// SECURITY DEFINER questionnaire_get / questionnaire_submit (accessibles à anon).

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  network: string;
  retry: string;
  resumed: string;
};

const T: Record<Lang, Tr> = {
  fr: {
    loading: 'Chargement…',
    hi: 'Salut',
    defaultDesc: 'Réponds en pensant à ton sport. Il n’y a pas de bonne ou de mauvaise réponse.',
    answers: 'réponses',
    done: 'C’est fait',
    oops: 'Oups',
    thanks: 'Merci ! Tes réponses ont bien été enregistrées. 🎉',
    already: 'Ce questionnaire a déjà été complété. Merci !',
    expired: 'Ce lien a expiré. Demande un nouveau lien à ton coach.',
    invalid: 'Lien invalide ou introuvable.',
    home: 'Retour à l’accueil',
    send: 'Envoyer mes réponses',
    sending: 'Envoi…',
    remaining: (n: number) => `Encore ${n} question(s)`,
    incomplete: 'Merci de répondre à toutes les questions.',
    alreadyShort: 'Ce questionnaire a déjà été complété.',
    genericErr: 'Une erreur est survenue.',
    footer: 'Tes réponses sont partagées avec ton coach pour t’aider à progresser.',
    session: 'Séance',
    network: 'La connexion est coupée. Tes réponses sont gardées sur cet appareil : réessaie dans un instant.',
    retry: 'Réessayer',
    resumed: 'On a gardé tes réponses : tu reprends là où tu t’étais arrêté.',
  },
  en: {
    loading: 'Loading…',
    hi: 'Hi',
    defaultDesc: 'Answer thinking about your sport. There are no right or wrong answers.',
    answers: 'answers',
    done: 'All done',
    oops: 'Oops',
    thanks: 'Thank you! Your answers have been saved. 🎉',
    already: 'This questionnaire has already been completed. Thank you!',
    expired: 'This link has expired. Ask your coach for a new one.',
    invalid: 'Invalid or missing link.',
    home: 'Back to home',
    send: 'Send my answers',
    sending: 'Sending…',
    remaining: (n: number) => `${n} question(s) left`,
    incomplete: 'Please answer every question.',
    alreadyShort: 'This questionnaire has already been completed.',
    genericErr: 'Something went wrong.',
    footer: 'Your answers are shared with your coach to help you progress.',
    session: 'Session',
    network: 'The connection dropped. Your answers are kept on this device: try again in a moment.',
    retry: 'Try again',
    resumed: 'Your answers were saved: pick up where you left off.',
  },
};

// Brouillon local : 43 questions LSSS — un rechargement, un appel ou l'écran
// qui se verrouille ne doivent pas faire tout recommencer à l'enfant.
const draftKey = (token: string) => `thrive-q-draft-${token}`;
function readDraft(token: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(draftKey(token));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function writeDraft(token: string, answers: Record<string, number> | null) {
  try {
    if (answers) window.localStorage.setItem(draftKey(token), JSON.stringify(answers));
    else window.localStorage.removeItem(draftKey(token));
  } catch {
    /* stockage indisponible (navigation privée) : on continue sans brouillon */
  }
}

// Défini HORS du composant de page : recréé à chaque rendu, il démontait et
// remontait toute la page à chaque réponse (focus perdu pour VoiceOver/TalkBack).
function Shell({ isPerma, children }: { isPerma: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: isPerma
          ? 'radial-gradient(125% 85% at 50% -12%, #3a2a10 0%, #2e2410 24%, #241a08 52%, #140e04 100%)'
          : 'radial-gradient(125% 85% at 50% -12%, #0a3a44 0%, #06303a 24%, #042430 52%, #03161b 100%)',
        color: '#eaf3f1',
        fontFamily: "'Inter',system-ui,sans-serif",
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

export default function QuestionnairePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const queryClient = useQueryClient();

  const [state, setState] = useState<LoadState | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resumed, setResumed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const { data, error, status } = await supabase.rpc('questionnaire_get', { p_token: token });
    // Réseau coupé (status 0) ou serveur indisponible (5xx) : « réessaie ».
    // Toute autre erreur est un lien invalide — p_token est un uuid : un lien
    // tronqué renvoie 400 (22P02), ce n'est pas un problème de connexion.
    // Lien inconnu ou expiré : le RPC le signale dans `data.error`.
    if (error) {
      setState({ error: status === 0 || status >= 500 ? 'network' : 'not_found' });
      return;
    }
    const loaded = data as LoadState;
    setState(loaded);
    if (!loaded?.error && !loaded?.completed) {
      const ids = new Set((loaded.items ?? []).map((i) => i.id));
      const draft = Object.fromEntries(
        Object.entries(readDraft(token)).filter(([id, v]) => ids.has(id) && Number.isInteger(v))
      );
      if (Object.keys(draft).length) {
        setAnswers(draft);
        setResumed(true);
      }
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const lang: Lang = state?.lang === 'en' ? 'en' : 'fr';
  const tr = T[lang];
  const isPerma = state?.kind === 'PERMA';

  const grouped = useMemo(() => {
    const items = state?.items ?? [];
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.group_label) ?? [];
      arr.push(it);
      map.set(it.group_label, arr);
    }
    return Array.from(map.entries());
  }, [state]);

  const total = state?.items?.length ?? 0;
  const answered = Object.keys(answers).length;
  const allAnswered = total > 0 && answered >= total;

  const answer = (itemId: string, v: number) =>
    setAnswers((a) => {
      const next = { ...a, [itemId]: v };
      if (token) writeDraft(token, next);
      return next;
    });

  const submit = async () => {
    if (!token || !allAnswered) return;
    setSubmitting(true);
    setSubmitError('');
    const { data, error, status } = await supabase.rpc('questionnaire_submit', { p_token: token, p_answers: answers });
    setSubmitting(false);
    if (error) {
      // Message technique jamais affiché à l'enfant ; ses réponses restent là.
      setSubmitError(status === 0 || status >= 500 ? tr.network : tr.genericErr);
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
    setDone(true);
    writeDraft(token, null);
    // Le parent revient souvent au bilan juste après (flux notification →
    // /q/<token> → bilan) : on invalide le cache partagé pour que la courbe
    // EPOCH et la jauge LSSS intègrent la séance sans attendre l'expiration.
    queryClient.invalidateQueries({ queryKey: ['bilan'] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Palette : PERMA (bien-être, tons chauds) vs LSSS (turquoise) — accent commun jaune.
  const accent = '#F9EB50';
  const groupColor = isPerma ? '#F6B45A' : '#A7C4BC';


  if (!state) {
    return (
      <Shell isPerma={isPerma}>
        <div style={{ height: 200, display: 'grid', placeItems: 'center', opacity: 0.6 }}>{T.fr.loading}</div>
      </Shell>
    );
  }

  if (state.error === 'network') {
    return (
      <Shell isPerma={isPerma}>
        <div style={{ textAlign: 'center', paddingTop: 60 }} role="alert">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{tr.oops}</h1>
          <p style={{ opacity: 0.7, lineHeight: 1.5, marginBottom: 28 }}>{tr.network}</p>
          <button
            onClick={async () => {
              setRetrying(true);
              await load();
              setRetrying(false);
            }}
            disabled={retrying}
            style={{
              minHeight: 52,
              padding: '0 28px',
              borderRadius: 16,
              border: 'none',
              background: accent,
              color: '#06222a',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              opacity: retrying ? 0.6 : 1,
            }}
          >
            {retrying ? tr.loading : tr.retry}
          </button>
        </div>
      </Shell>
    );
  }

  if (state.error || done || state.completed) {
    const msg = done
      ? tr.thanks
      : state.completed
      ? tr.already
      : state.error === 'expired'
      ? tr.expired
      : tr.invalid;
    return (
      <Shell isPerma={isPerma}>
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{done || state.completed ? '✅' : '⚠️'}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            {done || state.completed ? tr.done : tr.oops}
          </h1>
          <p style={{ opacity: 0.7, lineHeight: 1.5, marginBottom: 28 }}>{msg}</p>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 52,
              padding: '0 28px',
              borderRadius: 16,
              background: accent,
              color: '#06222a',
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

  return (
    <Shell isPerma={isPerma}>
      <header style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: groupColor }}>
          {kindLabel}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 8px' }}>
          {tr.hi} {state.child_first_name} 👋
        </h1>
        <p style={{ opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>{state.description ?? tr.defaultDesc}</p>
        {resumed && (
          <p role="status" style={{ marginTop: 12, fontSize: 13, color: accent }}>
            {tr.resumed}
          </p>
        )}
      </header>

      {/* Barre de progression */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          padding: '10px 0',
          background: isPerma
            ? 'linear-gradient(180deg,#241a08,rgba(36,26,8,0))'
            : 'linear-gradient(180deg,#042430,rgba(4,36,48,0))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ opacity: 0.7 }}>
            {answered}/{total} {tr.answers}
          </span>
          <span style={{ color: accent }}>{total ? Math.round((answered / total) * 100) : 0}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${total ? (answered / total) * 100 : 0}%`,
              height: '100%',
              background: `linear-gradient(90deg,${groupColor},${accent})`,
              transition: 'width .3s ease',
            }}
          />
        </div>
      </div>

      {/* Questions groupées (pilier PERMA ou sous-échelle LSSS) */}
      {grouped.map(([label, items]) => (
        <section key={label} style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: groupColor, marginBottom: 10 }}>{label}</h2>
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
                <p id={`q-${it.id}`} style={{ fontSize: 14, marginBottom: 12, lineHeight: 1.4 }}>{it.prompt}</p>
                <div role="group" aria-labelledby={`q-${it.id}`} style={{ display: 'flex', gap: 6 }}>
                  {SCALE[isPerma ? 'PERMA' : 'LSSS'][lang].map((s) => {
                    const active = answers[it.id] === s.v;
                    return (
                      <button
                        key={s.v}
                        onClick={() => answer(it.id, s.v)}
                        aria-pressed={active}
                        style={{
                          flex: 1,
                          minHeight: 52,
                          borderRadius: 12,
                          border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,.12)',
                          background: active ? 'rgba(249,235,80,.18)' : 'rgba(255,255,255,.03)',
                          color: active ? accent : 'rgba(234,243,241,.8)',
                          fontWeight: 700,
                          fontSize: 16,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                        aria-label={`${s.v} — ${s.label}`}
                      >
                        {s.v}
                        <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8, lineHeight: 1.15, textAlign: 'center', padding: '0 2px' }}>
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
        <p role="alert" style={{ marginTop: 18, padding: 12, borderRadius: 12, background: 'rgba(220,80,80,.15)', color: '#ffb4b4', fontSize: 14 }}>
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
          background: allAnswered ? accent : 'rgba(255,255,255,.1)',
          color: allAnswered ? '#06222a' : 'rgba(234,243,241,.4)',
          fontWeight: 700,
          fontSize: 16,
          cursor: allAnswered ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? tr.sending : allAnswered ? tr.send : tr.remaining(total - answered)}
      </button>
      <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.4, marginTop: 14 }}>{tr.footer}</p>
    </Shell>
  );
}
