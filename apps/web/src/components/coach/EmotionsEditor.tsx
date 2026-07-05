'use client';

// Roue des émotions — relevés successifs (émotion + intensité + contexte).
// Écrit dans public.emotion_logs. Le plus récent alimente la « roue » du parent.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { EmotionLog, fetchEmotionLogs } from '@/lib/bilan';
import { Btn, Select, TextInput } from './ui';

const EMOTIONS = [
  'Confiance', 'Trac', 'Frustration', 'Peur', 'Colère',
  'Joie', 'Fierté', 'Nervosité', 'Détermination', 'Calme',
];

export function EmotionsEditor({ childId }: { childId: string }) {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<EmotionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [emotion, setEmotion] = useState(EMOTIONS[0]);
  const [intensity, setIntensity] = useState(3);
  const [context, setContext] = useState('');
  const [sessionNumber, setSessionNumber] = useState('');

  const load = useCallback(async () => {
    setLogs(await fetchEmotionLogs(childId));
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const add = async () => {
    setError('');
    const { error: e } = await supabase.from('emotion_logs').insert({
      child_id: childId,
      emotion,
      intensity,
      context: context.trim() || null,
      session_number: sessionNumber ? Number(sessionNumber) : null,
      created_by: user?.id ?? null,
    });
    if (e) {
      setError(e.message);
      return;
    }
    setContext('');
    setSessionNumber('');
    await load();
  };

  const remove = async (id: string) => {
    setLogs((xs) => xs.filter((l) => l.id !== id));
    await supabase.from('emotion_logs').delete().eq('id', id);
  };

  return (
    <div className="space-y-3">
      {error && <p className="p-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <div className="rounded-xl border border-gray-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <Select
          label="Émotion"
          value={emotion}
          onChange={setEmotion}
          options={EMOTIONS.map((e) => ({ value: e, label: e }))}
        />
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">Intensité · {intensity}/5</span>
          <input
            type="range"
            min={1}
            max={5}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-navy-600"
          />
        </label>
        <TextInput label="Séance n°" type="number" value={sessionNumber} onChange={setSessionNumber} />
        <TextInput label="Contexte" value={context} onChange={setContext} placeholder="Ex. avant un tir" />
        <div className="col-span-2 sm:col-span-4">
          <Btn variant="ghost" onClick={add}>
            + Enregistrer le relevé
          </Btn>
        </div>
      </div>

      {loading ? (
        <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun relevé émotionnel.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center gap-3 text-sm border border-gray-100 rounded-lg px-3 py-2">
              <span className="font-semibold text-navy-900">{l.emotion}</span>
              {l.intensity != null && <span className="text-gray-400">{l.intensity}/5</span>}
              {l.session_number != null && (
                <span className="text-[11px] bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">
                  S{l.session_number}
                </span>
              )}
              {l.context && <span className="text-gray-500 truncate">— {l.context}</span>}
              <span className="ml-auto text-[11px] text-gray-300">
                {new Date(l.created_at).toLocaleDateString('fr-CA')}
              </span>
              <button
                onClick={() => remove(l.id)}
                className="text-gray-300 hover:text-red-600 cursor-pointer"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
