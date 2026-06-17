'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';

type ParentReport = {
  id: string;
  child_id: string;
  parent_visible_body: {
    detail_level?: number;
    session_number?: number | null;
    age_group?: string | null;
    sections?: Record<string, unknown>;
  } | null;
  language: string;
  seen_at: string | null;
  created_at: string;
};

// Ordre + libellés d'affichage des sections assemblées par l'EF
const SECTION_META: [string, string][] = [
  ['objectif', 'Objectif travaillé'],
  ['resume', 'Résumé de la séance'],
  ['forces', 'Forces observées'],
  ['recommandations_maison', 'À la maison'],
  ['transfert', 'Transfert hors du sport'],
  ['reussites', 'Réussites'],
  ['rpe', 'Intensité ressentie (RPE)'],
  ['message_coach', 'Message du coach'],
];

export default function BilansPage() {
  const { children, selectedChildId } = useChildStore();
  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  const [reports, setReports] = useState<ParentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedChildId) {
      setReports([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('parent_reports')
      .select('id, child_id, parent_visible_body, language, seen_at, created_at')
      .eq('child_id', selectedChildId)
      .order('created_at', { ascending: false });
    setReports((data ?? []) as ParentReport[]);
    setLoading(false);
  }, [selectedChildId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Temps réel : nouveau bilan parent généré par le coach
  useEffect(() => {
    if (!selectedChildId) return;
    const channel = supabase
      .channel(`bilans-${selectedChildId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parent_reports', filter: `child_id=eq.${selectedChildId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, load]);

  const toggle = async (r: ParentReport) => {
    const next = open === r.id ? null : r.id;
    setOpen(next);
    // Marque comme lu à la première ouverture (KPI d'ouverture)
    if (next === r.id && !r.seen_at) {
      const seenAt = new Date().toISOString();
      setReports((list) => list.map((x) => (x.id === r.id ? { ...x, seen_at: seenAt } : x)));
      await supabase.from('parent_reports').update({ seen_at: seenAt }).eq('id', r.id).is('seen_at', null);
    }
  };

  if (!selectedChild) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center text-2xl text-sun">✉</div>
        <h2 className="font-display text-2xl font-semibold text-white mb-3">Aucun profil enfant</h2>
        <p className="text-white/55">Ajoute un enfant pour voir ses bilans de séance.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Bilans de {selectedChild.first_name}</h1>
      <p className="text-white/55 mb-8">Les bilans rédigés par le coach après chaque séance, mis à jour automatiquement.</p>

      {reports.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/[0.04] text-white/55 text-sm">
          Aucun bilan pour l&apos;instant. Ils apparaîtront ici dès que le coach de {selectedChild.first_name} en publiera un.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const body = r.parent_visible_body ?? {};
            const sections = (body.sections ?? {}) as Record<string, unknown>;
            const isOpen = open === r.id;
            const present = SECTION_META.filter(([k]) => {
              const v = sections[k];
              return v !== null && v !== undefined && v !== '';
            });
            const title = (sections['objectif'] as string) || `Bilan${body.session_number ? ` · séance ${body.session_number}` : ''}`;

            return (
              <div key={r.id} className="rounded-2xl glass-navy overflow-hidden">
                <button className="w-full flex items-center gap-3 p-5 text-left" onClick={() => toggle(r)}>
                  <span className="w-10 h-10 rounded-full bg-sage/20 text-sage flex items-center justify-center shrink-0">✉</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white truncate">{title}</span>
                    <span className="block text-xs text-white/50 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </span>
                  {!r.seen_at && (
                    <span className="px-2.5 py-1 rounded-full bg-sun text-navy-900 text-[11px] font-bold">Nouveau</span>
                  )}
                  <span className="text-white/40 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/10 space-y-4">
                    {present.length === 0 && (
                      <p className="text-sm text-white/55 mt-3">Bilan en cours de préparation par le coach.</p>
                    )}
                    {present.map(([key, label]) => (
                      <div key={key} className="mt-3">
                        <span className="block text-xs font-bold uppercase tracking-wide text-white/45 mb-1">{label}</span>
                        <p className="text-sm text-white/80 whitespace-pre-line">{String(sections[key])}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
