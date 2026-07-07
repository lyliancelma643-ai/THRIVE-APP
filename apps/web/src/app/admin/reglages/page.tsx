'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';

// ─────────────────────────────────────────────────────────────────────────────
// Réglages plateforme — SUPER ADMIN uniquement.
// Feature flags stockés côté serveur (table app_settings, RLS : écriture
// réservée au Super Admin). Appliqués à TOUS les comptes instantanément.
// ─────────────────────────────────────────────────────────────────────────────

type Setting = {
  key: string;
  enabled: boolean;
  note: string | null;
  updated_at: string;
};

const FLAG_LABELS: Record<string, { title: string; description: string }> = {
  fitness_enabled: {
    title: 'Section Fitness',
    description:
      'OFF : la section affiche « en construction » pour tous les comptes. ' +
      'ON : la bibliothèque vidéo redevient accessible aux comptes activés.',
  },
};

export default function AdminReglagesPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('app_settings')
      .select('key, enabled, note, updated_at')
      .order('key');
    if (err) {
      setError('Réglages indisponibles — la migration 035 doit être appliquée.');
    } else {
      setSettings((data ?? []) as Setting[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (key: string, next: boolean) => {
    setBusy(key);
    setError(null);
    const { error: err } = await supabase
      .from('app_settings')
      .update({ enabled: next, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
      .eq('key', key);
    if (err) setError(err.message);
    await load();
    setBusy(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-slate-500">Cette page est réservée au Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Réglages plateforme</h1>
        <p className="text-slate-500 text-sm mt-1">
          Interrupteurs globaux, appliqués côté serveur à tous les comptes.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
      ) : (
        settings.map((s) => {
          const meta = FLAG_LABELS[s.key] ?? { title: s.key, description: s.note ?? '' };
          return (
            <div
              key={s.key}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-start justify-between gap-6"
            >
              <div>
                <p className="font-bold text-navy-900">{meta.title}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{meta.description}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Dernière modification : {new Date(s.updated_at).toLocaleString('fr-CA')}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={s.enabled}
                aria-label={meta.title}
                disabled={busy === s.key}
                onClick={() => toggle(s.key, !s.enabled)}
                className={`relative shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
                  s.enabled ? 'bg-navy-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                    s.enabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
