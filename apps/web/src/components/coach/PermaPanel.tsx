'use client';

// Panneau bien-être EPOCH (coach) : envoi du questionnaire EPOCH (Kern et al.
// 2016) à l'enfant après une séance donnée (1..13), langue au choix (FR/EN).
// Suit le statut par séance et le score global. Administré à CHAQUE séance
// (≠ LSSS aux S3/7/13). Nommage technique perma_* conservé côté back.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { fetchPermaProgression, sendPerma } from '@/lib/bilan';
import { Btn } from './ui';

type QRow = {
  id: string;
  session_number: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  access_token: string | null;
  completed_at: string | null;
  created_at: string;
};

const SESSIONS = Array.from({ length: 13 }, (_, i) => i + 1);

export function PermaPanel({ childId }: { childId: string }) {
  const [rows, setRows] = useState<QRow[]>([]);
  const [scoreBySession, setScoreBySession] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<number>(1);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState<{ session: number; url: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('questionnaires')
      .select('id, session_number, status, access_token, completed_at, created_at')
      .eq('child_id', childId)
      .eq('kind', 'PERMA')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as QRow[]);
    const prog = await fetchPermaProgression(childId);
    const map: Record<number, number> = {};
    for (const p of prog) map[p.session_number] = p.value;
    setScoreBySession(map);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Rafraîchit dès que l'enfant complète (realtime)
  useEffect(() => {
    const ch = supabase
      .channel(`perma-${childId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questionnaires', filter: `child_id=eq.${childId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [childId, load]);

  // Statut le plus récent par séance
  const latestBySession = useMemo(() => {
    const map = new Map<number, QRow>();
    for (const r of rows) {
      if (r.session_number == null) continue;
      if (!map.has(r.session_number)) map.set(r.session_number, r); // rows déjà triées desc
    }
    return map;
  }, [rows]);

  const send = async () => {
    setBusy(true);
    setError('');
    const res = await sendPerma(childId, session, lang);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.alreadySent) {
      setError(`Le test de la séance ${session} a déjà été envoyé — un seul envoi par séance.`);
    }
    if (res.path && typeof window !== 'undefined') {
      setLink({ session, url: `${window.location.origin}${res.path}` });
    }
    await load();
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard indisponible */
    }
  };

  const completedCount = SESSIONS.filter((s) => latestBySession.get(s)?.status === 'COMPLETED').length;

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 p-3">
        <label className="text-sm">
          <span className="block text-xs font-semibold text-navy-900 mb-1">Séance</span>
          <select
            value={session}
            onChange={(e) => setSession(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {SESSIONS.map((s) => (
              <option key={s} value={s}>
                Séance {s}
                {latestBySession.get(s)?.status === 'COMPLETED' ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-navy-900 mb-1">Langue</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        {(() => {
          const q = latestBySession.get(session);
          if (!q) {
            return (
              <Btn variant="ghost" disabled={busy} onClick={send}>
                {busy ? 'Envoi…' : `Envoyer (séance ${session})`}
              </Btn>
            );
          }
          return (
            <span className="flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-1.5 rounded-full font-semibold ${
                  q.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {q.status === 'COMPLETED' ? 'Complété ✓' : 'Envoyé — en attente'}
              </span>
              {q.status !== 'COMPLETED' && q.access_token && typeof window !== 'undefined' && (
                <button
                  onClick={() =>
                    setLink({ session, url: `${window.location.origin}/q/${q.access_token}` })
                  }
                  className="text-navy-600 font-semibold underline cursor-pointer"
                >
                  Voir le lien
                </button>
              )}
            </span>
          );
        })()}
      </div>
      <p className="text-[11px] text-gray-400 -mt-1">
        Un seul envoi par séance : le test redevient disponible à la séance suivante.
      </p>

      {link && (
        <div className="p-2 rounded-lg bg-navy-50 text-[11px] break-all">
          <p className="text-navy-700 mb-1">Lien enfant — séance {link.session} (envoyé au parent) :</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate">{link.url}</code>
            <button onClick={() => copy(link.url)} className="text-navy-600 font-semibold cursor-pointer">
              Copier
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-navy-900">Suivi par séance</p>
          <span className="text-[11px] text-gray-400">{completedCount}/13 complétées</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {SESSIONS.map((s) => {
            const q = latestBySession.get(s);
            const score = scoreBySession[s];
            const status = q?.status;
            const bg =
              status === 'COMPLETED'
                ? 'bg-emerald-500 text-white'
                : status
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-gray-100 text-gray-400';
            return (
              <div
                key={s}
                className={`rounded-lg h-11 flex flex-col items-center justify-center text-[11px] font-semibold ${bg}`}
                title={
                  status === 'COMPLETED'
                    ? `Séance ${s} — ${score ?? '✓'}/100`
                    : status
                    ? `Séance ${s} — en attente de l'enfant`
                    : `Séance ${s} — non envoyé`
                }
              >
                <span className="opacity-70">S{s}</span>
                <span>{status === 'COMPLETED' ? (score ?? '✓') : status ? '…' : '·'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />}
      <p className="text-[11px] text-gray-400">
        Le questionnaire EPOCH (20 questions, échelle « presque jamais » → « presque toujours ») est
        répondu par l&apos;enfant après chaque séance. Une notification est envoyée au parent avec le
        lien. Les résultats alimentent la courbe de bien-être du bilan.
      </p>
    </div>
  );
}
