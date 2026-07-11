'use client';

// Espace de travail complet du dossier athlète — réutilisé par le coach ET par
// l'admin/super-admin (correction). Compose tous les éditeurs + la carte de
// complétude. Chaque enregistrement rafraîchit la complétude.

import { useCallback, useEffect, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useAuthStore } from '@/stores/auth.store';
import { AthleteIdentityEditor } from '@/components/AthleteIdentityEditor';
import { programPct } from '@/lib/bilan';
import { SectionCard, Btn, nowHM } from './ui';
import { DossierCompleteness } from './DossierCompleteness';
import { ObjectivesEditor } from './ObjectivesEditor';
import { NextStepsEditor } from './NextStepsEditor';
import { EmotionsEditor } from './EmotionsEditor';
import { RoutineEditor } from './RoutineEditor';
import { DocumentsManager } from './DocumentsManager';
import { LsssPanel } from './LsssPanel';
import { PermaPanel } from './PermaPanel';
import { SessionsEditor } from './SessionsEditor';

function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-gray-50/50"
      >
        <div>
          <p className="font-semibold text-navy-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className="text-gray-400 text-sm shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

function ProgramPctCard({
  childId,
  sessionsCompleted,
  onChange,
}: {
  childId: string;
  sessionsCompleted: number;
  onChange?: () => void;
}) {
  const { user } = useAuthStore();
  const [override, setOverride] = useState<number | null>(null);
  const [useOverride, setUseOverride] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const auto = programPct(sessionsCompleted, 13, null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('athlete_identity')
        .select('program_pct_override')
        .eq('child_id', childId)
        .maybeSingle();
      if (data?.program_pct_override != null) {
        setUseOverride(true);
        setOverride(data.program_pct_override);
      }
    })();
  }, [childId]);

  const save = async () => {
    const value = useOverride ? override ?? auto : null;
    await supabase
      .from('athlete_identity')
      .upsert({ child_id: childId, program_pct_override: value, updated_by: user?.id ?? null }, { onConflict: 'child_id' });
    setSavedAt(nowHM());
    onChange?.();
  };

  const effective = useOverride ? override ?? auto : auto;

  return (
    <SectionCard
      title="Pourcentage de complétion du programme"
      subtitle="Calcul auto (séances complétées / 13) — ajustable manuellement"
      right={<span className="text-2xl font-bold text-navy-900">{effective}%</span>}
    >
      <label className="flex items-center gap-2 text-sm text-navy-700">
        <input
          type="checkbox"
          checked={useOverride}
          onChange={(e) => setUseOverride(e.target.checked)}
          className="accent-navy-600 w-4 h-4"
        />
        Forcer une valeur manuelle (sinon {auto}% automatiques)
      </label>
      {useOverride && (
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={override ?? auto}
          onChange={(e) => setOverride(Number(e.target.value))}
          className="w-full accent-navy-600"
        />
      )}
      <div className="flex items-center gap-3">
        <Btn onClick={save}>Enregistrer le %</Btn>
        {savedAt && <span className="text-xs text-green-600 font-medium">Enregistré à {savedAt}</span>}
      </div>
    </SectionCard>
  );
}

export function AthleteWorkspace({
  childId,
  childName,
  dateOfBirth,
}: {
  childId: string;
  childName?: string;
  dateOfBirth: string | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const loadCounts = useCallback(async () => {
    const { data } = await supabase.from('sessions').select('status').eq('child_id', childId);
    setSessionsCompleted((data ?? []).filter((s: any) => s.status === 'COMPLETED').length);
  }, [childId]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, refreshKey]);

  return (
    <div className="space-y-4">
      <DossierCompleteness childId={childId} refreshKey={refreshKey} />

      <ProgramPctCard childId={childId} sessionsCompleted={sessionsCompleted} onChange={bump} />

      <Accordion
        title="Carte d'identité de l'athlète"
        subtitle="Sport, poste, histoire, forces, objectifs, boîte à outils, focus word, lettre"
        defaultOpen
      >
        <AthleteIdentityEditor key={childId} childId={childId} childName={childName} onSaved={bump} />
      </Accordion>

      <Accordion title="Objectifs SMART détaillés" subtitle="Échéances + statut + progression">
        <ObjectivesEditor childId={childId} />
      </Accordion>

      <Accordion title="Parcours des 13 séances" subtitle="Statut par séance + notes du coach">
        <SessionsEditor childId={childId} dateOfBirth={dateOfBirth} onChange={bump} />
      </Accordion>

      <Accordion title="Routine de pré-tir" subtitle="Séquence personnalisée éditable">
        <RoutineEditor childId={childId} />
      </Accordion>

      <Accordion title="Roue des émotions" subtitle="Historique des relevés émotionnels">
        <EmotionsEditor childId={childId} />
      </Accordion>

      <Accordion
        title="Documents (PDF)"
        subtitle="Contrat de confiance, lettre à moi-même, certificat THRIVE"
      >
        <DocumentsManager childId={childId} />
      </Accordion>

      <Accordion
        title="Météo du bien-être (PERMA)"
        subtitle="Envoi après chaque séance + courbe de bien-être (5 piliers)"
      >
        <PermaPanel childId={childId} />
      </Accordion>

      <Accordion
        title="Questionnaire LSSS"
        subtitle="Envoi aux séances 3 · 7 · 13 + résultats (compétences de vie)"
      >
        <LsssPanel childId={childId} />
      </Accordion>

      <Accordion title="Prochaines étapes" subtitle="Visibles par le parent dans le bilan">
        <NextStepsEditor childId={childId} />
      </Accordion>
    </div>
  );
}
