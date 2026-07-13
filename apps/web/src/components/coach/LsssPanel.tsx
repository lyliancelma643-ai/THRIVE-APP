'use client';

// Panneau LSSS (coach) : envoi du questionnaire à l'enfant (lien dédié),
// suivi du statut par moment (Départ / Mi-parcours / Final) et résultats.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { LsssMoment, LSSS_MOMENT_LABEL, fetchLsssProgression, sendLsss } from '@/lib/bilan';
import { Btn } from './ui';

type QRow = {
  id: string;
  moment: LsssMoment | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  access_token: string | null;
  completed_at: string | null;
  created_at: string;
};

const MOMENTS: LsssMoment[] = ['BASELINE', 'MID', 'FINAL'];

export function LsssPanel({ childId }: { childId: string }) {
  const [rows, setRows] = useState<QRow[]>([]);
  const [progression, setProgression] = useState<{ moment: LsssMoment; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<LsssMoment | null>(null);
  const [error, setError] = useState('');
  const [linkFor, setLinkFor] = useState<{ moment: LsssMoment; url: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('questionnaires')
      .select('id, moment, status, access_token, completed_at, created_at')
      .eq('child_id', childId)
      .eq('kind', 'LSSS')
      .order('created_at', { ascending: false });
    setRows((data ?? []) as QRow[]);
    setProgression((await fetchLsssProgression(childId)).map((p) => ({ moment: p.moment, value: p.value })));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Rafraîchit dès que l'enfant complète (realtime)
  useEffect(() => {
    const ch = supabase
      .channel(`lsss-${childId}`)
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

  const latestFor = (m: LsssMoment) => rows.find((r) => r.moment === m);

  const send = async (m: LsssMoment) => {
    setBusy(m);
    setError('');
    const res = await sendLsss(childId, m);
    setBusy(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.path && typeof window !== 'undefined') {
      setLinkFor({ moment: m, url: `${window.location.origin}${res.path}` });
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

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MOMENTS.map((m) => {
          const q = latestFor(m);
          const score = progression.find((p) => p.moment === m)?.value;
          return (
            <div key={m} className="rounded-xl border border-gray-200 p-3">
              <p className="text-sm font-semibold text-navy-900">{LSSS_MOMENT_LABEL[m]}</p>
              <div className="mt-2 mb-3 min-h-[46px]">
                {loading ? (
                  <div className="h-6 w-24 rounded bg-gray-100 animate-pulse" />
                ) : q?.status === 'COMPLETED' ? (
                  <div>
                    <span className="text-2xl font-bold text-emerald-600">{score ?? '✓'}</span>
                    {score != null && <span className="text-sm text-gray-400"> /100</span>}
                    <p className="text-[11px] text-gray-400">
                      Complété le {q.completed_at && new Date(q.completed_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                ) : q ? (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    En attente de l&apos;enfant
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Non envoyé</span>
                )}
              </div>
              {q ? (
                q.status !== 'COMPLETED' && q.access_token ? (
                  <button
                    onClick={() =>
                      typeof window !== 'undefined' &&
                      setLinkFor({ moment: m, url: `${window.location.origin}/q/${q.access_token}` })
                    }
                    className="text-xs text-navy-600 font-semibold underline cursor-pointer"
                  >
                    Voir le lien
                  </button>
                ) : null
              ) : (
                <Btn variant="ghost" disabled={busy === m} onClick={() => send(m)}>
                  {busy === m ? 'Envoi…' : 'Envoyer le questionnaire'}
                </Btn>
              )}

              {linkFor?.moment === m && (
                <div className="mt-2 p-2 rounded-lg bg-navy-50 text-[11px] break-all">
                  <p className="text-navy-700 mb-1">Lien enfant (envoyé au parent) :</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate">{linkFor.url}</code>
                    <button
                      onClick={() => copy(linkFor.url)}
                      className="text-navy-600 font-semibold cursor-pointer"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400">
        Le questionnaire est répondu par l&apos;enfant. Une notification est envoyée au parent avec le
        lien. Les résultats alimentent automatiquement la progression des compétences de vie du bilan.
      </p>
    </div>
  );
}
