'use client';

import { useRef, useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useModalDismiss } from '@/lib/useModalDismiss';
import {
  PARENT_SECTIONS,
  PROGRAM_PACK_LABELS,
  PROGRAM_PACK_ORDER,
  asProgramPack,
  type ParentSection,
  type ProgramPack,
} from '@/lib/program-packs';

// ─────────────────────────────────────────────────────────────────────────────
// Accès d'un parent, section par section (Admin / Super Admin — migration 068).
//
//   • Pack THRIVE (Groupe / Individuel / Complet) → ouvre Maison automatiquement.
//   • Chaque section : Auto (règle ci-dessous) · Ouvert · Fermé. Le manuel
//     l'emporte toujours (ex. ouvrir Mes séances à un abonné Maison seul).
//
// Règle automatique (calculée en base, admin_parent_access_list) :
//   Maison = pack OU compte activé OU abonnement Maison ;
//   Bilan / Mes séances = compte activé par le coach.
// ─────────────────────────────────────────────────────────────────────────────

export type ParentAccessRow = {
  parent_id: string;
  program_pack: ProgramPack | null;
  maison: boolean | null;
  bilan: boolean | null;
  seances: boolean | null;
  note: string | null;
  coach_unlocked: boolean;
  p3_subscribed: boolean;
  auto_maison: boolean;
  auto_bilan: boolean;
  auto_seances: boolean;
  eff_maison: boolean;
  eff_bilan: boolean;
  eff_seances: boolean;
};

export async function fetchParentAccess(): Promise<Map<string, ParentAccessRow>> {
  const map = new Map<string, ParentAccessRow>();
  const { data, error } = await supabase.rpc('admin_parent_access_list');
  if (error || !Array.isArray(data)) return map; // migration 068 pas encore appliquée
  for (const r of data as ParentAccessRow[]) {
    map.set(r.parent_id, { ...r, program_pack: asProgramPack(r.program_pack) });
  }
  return map;
}

const eff = (row: ParentAccessRow | undefined, s: ParentSection) =>
  row ? row[`eff_${s}` as const] : false;

/** Pastilles compactes du tableau : vert = ouvert, gris = fermé, ✎ = forcé à la main. */
export function AccessBadges({ row }: { row: ParentAccessRow | undefined }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PARENT_SECTIONS.map(({ key, label }) => {
        const open = eff(row, key);
        const forced = row ? row[key] !== null : false;
        return (
          <span
            key={key}
            title={`${label} : ${open ? 'ouvert' : 'fermé'}${forced ? ' (manuel)' : ' (auto)'}`}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 line-through'
            }`}
          >
            {label}
            {forced ? ' ✎' : ''}
          </span>
        );
      })}
    </div>
  );
}

type Mode = 'auto' | 'open' | 'closed';
const toMode = (v: boolean | null): Mode => (v === null ? 'auto' : v ? 'open' : 'closed');
const fromMode = (m: Mode): boolean | null => (m === 'auto' ? null : m === 'open');

export function ParentAccessEditor({
  parentId,
  parentName,
  row,
  onClose,
  onSaved,
}: {
  parentId: string;
  parentName: string;
  row: ParentAccessRow | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [pack, setPack] = useState<ProgramPack | null>(row?.program_pack ?? null);
  const [modes, setModes] = useState<Record<ParentSection, Mode>>({
    maison: toMode(row?.maison ?? null),
    bilan: toMode(row?.bilan ?? null),
    seances: toMode(row?.seances ?? null),
  });
  const [note, setNote] = useState(row?.note ?? '');
  useModalDismiss(() => { if (!saving) onClose(); }, true, true, ref);

  // Règle automatique recalculée localement pour refléter le pack choisi
  // avant enregistrement (même formule qu'en base).
  const unlocked = row?.coach_unlocked ?? false;
  const subscribed = row?.p3_subscribed ?? false;
  const auto: Record<ParentSection, boolean> = {
    maison: pack !== null || unlocked || subscribed,
    bilan: unlocked,
    seances: unlocked,
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('parent_access').upsert(
      {
        parent_id: parentId,
        program_pack: pack,
        maison: fromMode(modes.maison),
        bilan: fromMode(modes.bilan),
        seances: fromMode(modes.seances),
        note: note.trim() || null,
      },
      { onConflict: 'parent_id' }
    );
    setSaving(false);
    if (error) {
      alert("Impossible d'enregistrer les accès : " + error.message);
      return;
    }
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => { if (!saving) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-access-title"
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="parent-access-title" className="text-lg font-bold">Accès de {parentName}</h2>
            <p className="text-xs text-gray-600 mt-1">
              {unlocked ? 'Compte activé par le coach' : 'Compte non activé par le coach'}
              {' · '}
              {subscribed ? 'Abonnement Maison actif' : 'Pas d’abonnement Maison'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Fermer"
            className="text-gray-500 hover:text-gray-800 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Pack THRIVE */}
        <label className="block mt-5 text-sm font-semibold" htmlFor="program-pack">
          Pack THRIVE
        </label>
        <p className="text-xs text-gray-600 mb-2">Un pack ouvre automatiquement Maison.</p>
        <select
          id="program-pack"
          value={pack ?? ''}
          onChange={(e) => setPack(asProgramPack(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Aucun pack</option>
          {PROGRAM_PACK_ORDER.map((p) => (
            <option key={p} value={p}>
              Pack {PROGRAM_PACK_LABELS[p]}
            </option>
          ))}
        </select>

        {/* Sections */}
        <p className="mt-5 text-sm font-semibold">Sections</p>
        <p className="text-xs text-gray-600 mb-2">
          « Auto » suit la règle (pack, activation, abonnement). « Ouvert » / « Fermé » l’emportent sur la règle.
        </p>
        <div className="space-y-2">
          {PARENT_SECTIONS.map(({ key, label }) => {
            const mode = modes[key];
            const effective = mode === 'auto' ? auto[key] : mode === 'open';
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className={`text-xs ${effective ? 'text-green-700' : 'text-gray-500'}`}>
                    {effective ? 'Ouvert' : 'Fermé'}
                    {mode === 'auto' ? ' (automatique)' : ' (manuel)'}
                  </p>
                </div>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5" role="radiogroup" aria-label={`Accès ${label}`}>
                  {(['auto', 'open', 'closed'] as const).map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setModes((prev) => ({ ...prev, [key]: m }))}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        mode === m ? 'bg-white shadow-sm text-navy-900' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {m === 'auto' ? `Auto (${auto[key] ? 'ouvert' : 'fermé'})` : m === 'open' ? 'Ouvert' : 'Fermé'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <label className="block mt-5 text-sm font-semibold" htmlFor="access-note">
          Note interne <span className="font-normal text-gray-500">(optionnel)</span>
        </label>
        <textarea
          id="access-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Ex. : accès Mes séances offert jusqu’à la fin de la session"
          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
