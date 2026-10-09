'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
// Accès d'un parent (migration 080). Cet écran n'a AUCUN calcul de droit : il
// affiche ce que la base calcule (private.access_compute) et n'écrit que par
// les RPC auditées.
//
//   Ordre : override Super Admin > pack actif > abonnement Maison > rien.
//   • Pack (Admin ou Super Admin) : type + dates ; prolonger = nouvelle date de fin.
//   • Overrides (Super Admin seulement) : ouvert / fermé, raison obligatoire,
//     expiration optionnelle ; les webhooks ne les écrasent jamais.
//   • Règles globales (Super Admin) : fin de pack, délai de grâce.
//   • Journal : chaque modification manuelle (qui, quoi, quand, pourquoi).
// ─────────────────────────────────────────────────────────────────────────────

export type SectionSource = 'override' | 'pack' | 'abonnement' | 'historique' | 'aucune';
type OverrideInfo = { id: string; etat: 'ouvert' | 'ferme'; expire_le: string | null } | null;

export type ParentAccessRow = {
  parent_id: string;
  program_pack: ProgramPack | null;
  pack_debut: string | null;
  pack_fin: string | null;
  maison: boolean;
  bilan: boolean;
  seances: boolean;
  bilan_mode: string;
  seances_mode: string;
  source_maison: SectionSource;
  source_bilan: SectionSource;
  source_seances: SectionSource;
  fin_acces_maison: string | null;
  p3_subscribed: boolean;
  pack_et_abonnement: boolean;
  coach_unlocked: boolean;
  overrides: Record<ParentSection, OverrideInfo> | null;
  eff_maison: boolean;
  eff_bilan: boolean;
  eff_seances: boolean;
};

export async function fetchParentAccess(): Promise<Map<string, ParentAccessRow>> {
  const map = new Map<string, ParentAccessRow>();
  const { data, error } = await supabase.rpc('admin_parent_access_list');
  if (error || !Array.isArray(data)) return map;
  for (const r of data as ParentAccessRow[]) {
    map.set(r.parent_id, { ...r, program_pack: asProgramPack(r.program_pack) });
  }
  return map;
}

const SOURCE_LABEL: Record<string, string> = {
  override: 'décision Super Admin',
  pack: 'pack',
  abonnement: 'abonnement Maison',
  historique: 'historique du pack terminé',
  aucune: 'aucun droit',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('fr-CA') : '—';

/** Pastilles compactes du tableau : vert = ouvert, ambre = lecture seule, gris = fermé, ✎ = override. */
export function AccessBadges({ row }: { row: ParentAccessRow | undefined }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PARENT_SECTIONS.map(({ key, label }) => {
        const open = row ? row[`eff_${key}` as const] : false;
        const readonly = row && key !== 'maison' && row[`${key}_mode` as 'bilan_mode' | 'seances_mode'] === 'lecture';
        const forced = Boolean(row?.overrides?.[key]);
        const source = row ? row[`source_${key}` as const] : 'aucune';
        return (
          <span
            key={key}
            title={`${label} : ${open ? (readonly ? 'lecture seule' : 'ouvert') : 'fermé'} (${SOURCE_LABEL[source] ?? source})`}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              !open
                ? 'bg-gray-100 text-gray-500 line-through'
                : readonly
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {label}
            {forced ? ' ✎' : ''}
          </span>
        );
      })}
      {row?.pack_et_abonnement && (
        <span
          title="Pack actif ET abonnement Maison payé : rien n'est annulé automatiquement, à traiter à la main."
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap bg-red-100 text-red-700"
        >
          ⚠ Pack + abonnement
        </span>
      )}
    </div>
  );
}

type Detail = {
  state: {
    maison: boolean; bilan: boolean; seances: boolean;
    bilan_mode: string; seances_mode: string;
    source_maison: string; source_bilan: string; source_seances: string;
    pack_actif: string | null; pack_debut: string | null; pack_fin: string | null;
    fin_acces_maison: string | null; maison_en_grace: boolean;
    abonnement_actif: boolean; pack_et_abonnement: boolean;
    overrides: Record<ParentSection, OverrideInfo>;
  };
  packs: { id: string; pack: ProgramPack; starts_on: string; ends_on: string | null; source: string; note: string | null }[];
  overrides: {
    id: string; section: ParentSection; etat: string; raison: string; expire_le: string | null;
    cree_le: string; revoque_le: string | null; revoque_raison: string | null;
  }[];
  journal: { id: number; cree_le: string; acteur_role: string | null; objet: string; action: string; raison: string | null }[];
  parametres: { fin_pack_mode?: string; delai_grace_jours?: number };
  can_override: boolean;
};

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10';
const btn = 'rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50';

export function ParentAccessEditor({
  parentId,
  parentName,
  onClose,
  onSaved,
}: {
  parentId: string;
  parentName: string;
  row?: ParentAccessRow | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useModalDismiss(() => { if (!busy) onClose(); }, true, true, ref);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('admin_parent_access_detail', { p_parent: parentId });
    if (e) setError(e.message);
    else setDetail(data as Detail);
  }, [parentId]);

  useEffect(() => { void load(); }, [load]);

  // Toute écriture : RPC auditée → relecture du calcul serveur.
  const call = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc(fn, args);
    setBusy(false);
    if (e) {
      setError(e.message);
      return false;
    }
    await load();
    onSaved();
    return true;
  };

  // ── Formulaires ────────────────────────────────────────────────────────────
  const current = detail?.state.pack_actif ? detail.packs.find((p) => !p.ends_on || p.ends_on >= todayIso()) : undefined;
  const [pack, setPack] = useState<ProgramPack>('GROUPE');
  const [startsOn, setStartsOn] = useState(todayIso());
  const [endsOn, setEndsOn] = useState('');
  const [packReason, setPackReason] = useState('');
  useEffect(() => {
    if (!current) return;
    setPack(current.pack);
    setStartsOn(current.starts_on);
    setEndsOn(current.ends_on ?? '');
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [ovSection, setOvSection] = useState<ParentSection>('maison');
  const [ovEtat, setOvEtat] = useState<'ouvert' | 'ferme'>('ouvert');
  const [ovExpire, setOvExpire] = useState('');
  const [ovReason, setOvReason] = useState('');

  const [finMode, setFinMode] = useState('lecture_seule');
  const [grace, setGrace] = useState(0);
  const [paramReason, setParamReason] = useState('');
  useEffect(() => {
    if (!detail) return;
    setFinMode(detail.parametres.fin_pack_mode ?? 'lecture_seule');
    setGrace(Number(detail.parametres.delai_grace_jours ?? 0));
  }, [detail]);

  const s = detail?.state;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => { if (!busy) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-access-title"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="parent-access-title" className="text-lg font-bold">Accès de {parentName}</h2>
            <p className="text-xs text-gray-600 mt-1">
              Calcul serveur : override Super Admin &gt; pack &gt; abonnement Maison &gt; rien.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Fermer" className="text-gray-500 hover:text-gray-800 text-xl leading-none px-2">
            ×
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</p>}
        {!s ? (
          <div className="h-40 mt-4 rounded-xl bg-gray-100 animate-pulse" aria-hidden />
        ) : (
          <>
            {/* ── État calculé ─────────────────────────────────────────── */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PARENT_SECTIONS.map(({ key, label }) => {
                const open = s[key];
                const mode = key === 'maison' ? null : (s[`${key}_mode` as 'bilan_mode' | 'seances_mode']);
                const source = s[`source_${key}` as 'source_maison' | 'source_bilan' | 'source_seances'];
                return (
                  <div key={key} className="rounded-xl border border-gray-100 px-3 py-2.5">
                    <p className="text-sm font-medium">{label}</p>
                    <p className={`text-xs ${open ? (mode === 'lecture' ? 'text-amber-700' : 'text-green-700') : 'text-gray-500'}`}>
                      {open ? (mode === 'lecture' ? 'Lecture seule' : 'Ouvert') : 'Fermé'} · {SOURCE_LABEL[source] ?? source}
                    </p>
                    {key === 'maison' && open && (
                      <p className="text-[11px] text-gray-500">
                        {s.maison_en_grace ? 'Délai de grâce · ' : ''}jusqu’au {s.fin_acces_maison ? fmtDate(s.fin_acces_maison) : 'sans fin connue'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Abonnement Maison : {s.abonnement_actif ? 'actif' : 'aucun'}
            </p>
            {s.pack_et_abonnement && (
              <p className="mt-2 rounded-lg bg-red-50 text-red-700 text-xs px-3 py-2">
                ⚠ Pack actif ET abonnement Maison payé. Rien n’est annulé automatiquement : à régler avec le parent
                (pause, remboursement ou choix du parent).
              </p>
            )}

            {/* ── Pack ─────────────────────────────────────────────────── */}
            <h3 className="mt-6 text-sm font-bold">Pack THRIVE</h3>
            <p className="text-xs text-gray-600">
              {s.pack_actif
                ? `En cours : Pack ${PROGRAM_PACK_LABELS[s.pack_actif.toUpperCase() as ProgramPack]} depuis le ${fmtDate(s.pack_debut)}, fin ${s.pack_fin ? `le ${fmtDate(s.pack_fin)}` : 'non fixée'}.`
                : s.pack_fin
                  ? `Aucun pack en cours (dernier terminé le ${fmtDate(s.pack_fin)}).`
                  : 'Aucun pack.'}{' '}
              Un pack ouvre Maison, Bilan et Mes séances.
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select aria-label="Pack" value={pack} onChange={(e) => setPack(asProgramPack(e.target.value) ?? 'GROUPE')} className={input}>
                {PROGRAM_PACK_ORDER.map((p) => (
                  <option key={p} value={p}>Pack {PROGRAM_PACK_LABELS[p]}</option>
                ))}
              </select>
              <label className="text-xs text-gray-600">Début
                <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-gray-600">Fin (vide = non fixée)
                <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={input} />
              </label>
            </div>
            <input
              aria-label="Raison (pack)"
              value={packReason}
              onChange={(e) => setPackReason(e.target.value)}
              placeholder="Raison (obligatoire) — ex. paiement reçu, inscription automne"
              className={`${input} mt-2`}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                disabled={busy || packReason.trim().length < 3}
                onClick={async () => {
                  if (await call('admin_set_pack', { p_parent: parentId, p_pack: pack, p_starts_on: startsOn || null, p_ends_on: endsOn || null, p_raison: packReason }))
                    setPackReason('');
                }}
                className={`${btn} bg-navy-600 text-white hover:bg-navy-700`}
              >
                {s.pack_actif ? 'Modifier / prolonger le pack' : 'Attribuer le pack'}
              </button>
              {s.pack_actif && (
                <button
                  disabled={busy || packReason.trim().length < 3}
                  onClick={async () => {
                    if (await call('admin_end_pack', { p_parent: parentId, p_ends_on: null, p_raison: packReason })) setPackReason('');
                  }}
                  className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`}
                >
                  Terminer le pack maintenant
                </button>
              )}
            </div>

            {/* ── Overrides ───────────────────────────────────────────── */}
            <h3 className="mt-6 text-sm font-bold">Décisions manuelles (Super Admin)</h3>
            <p className="text-xs text-gray-600">Prioritaires sur tout le reste ; jamais écrasées par un paiement ou un webhook.</p>
            <ul className="mt-2 space-y-1.5">
              {detail.overrides.filter((o) => !o.revoque_le).map((o) => {
                const expired = o.expire_le && new Date(o.expire_le) <= new Date();
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs">
                    <span>
                      <strong>{PARENT_SECTIONS.find((x) => x.key === o.section)?.label}</strong> : {o.etat === 'ouvert' ? 'ouvert' : 'fermé'}
                      {o.expire_le ? ` jusqu’au ${fmtDate(o.expire_le)}` : ' sans expiration'}
                      {expired ? ' (expiré)' : ''} — « {o.raison} »
                    </span>
                    {detail.can_override && !expired && (
                      <button
                        disabled={busy || ovReason.trim().length < 3}
                        title="Indiquer la raison ci-dessous"
                        onClick={async () => {
                          if (await call('admin_revoke_access_override', { p_override: o.id, p_raison: ovReason })) setOvReason('');
                        }}
                        className={`${btn} py-1 bg-gray-100 text-gray-800 hover:bg-gray-200`}
                      >
                        Révoquer
                      </button>
                    )}
                  </li>
                );
              })}
              {detail.overrides.every((o) => o.revoque_le) && <li className="text-xs text-gray-500">Aucune décision manuelle active.</li>}
            </ul>
            {detail.can_override ? (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select aria-label="Section" value={ovSection} onChange={(e) => setOvSection(e.target.value as ParentSection)} className={input}>
                  {PARENT_SECTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select aria-label="État" value={ovEtat} onChange={(e) => setOvEtat(e.target.value as 'ouvert' | 'ferme')} className={input}>
                  <option value="ouvert">Ouvrir</option>
                  <option value="ferme">Fermer</option>
                </select>
                <label className="text-xs text-gray-600">Expire le (optionnel)
                  <input type="date" value={ovExpire} onChange={(e) => setOvExpire(e.target.value)} className={input} />
                </label>
                <input
                  aria-label="Raison (décision manuelle)"
                  value={ovReason}
                  onChange={(e) => setOvReason(e.target.value)}
                  placeholder="Raison (obligatoire, aussi pour révoquer)"
                  className={`${input} sm:col-span-2`}
                />
                <button
                  disabled={busy || ovReason.trim().length < 3}
                  onClick={async () => {
                    const expire = ovExpire ? new Date(`${ovExpire}T23:59:59`).toISOString() : null;
                    if (await call('admin_set_access_override', { p_user: parentId, p_section: ovSection, p_etat: ovEtat, p_raison: ovReason, p_expire_le: expire })) {
                      setOvReason('');
                      setOvExpire('');
                    }
                  }}
                  className={`${btn} bg-navy-600 text-white hover:bg-navy-700`}
                >
                  Appliquer
                </button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Réservé au Super Admin.</p>
            )}

            {/* ── Règles globales ─────────────────────────────────────── */}
            {detail.can_override && (
              <details className="mt-6 rounded-xl border border-gray-100 px-3 py-2">
                <summary className="text-sm font-bold cursor-pointer">Règles globales (tous les parents)</summary>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-xs text-gray-600">Fin de pack : Bilan et Mes séances
                    <select value={finMode} onChange={(e) => setFinMode(e.target.value)} className={input}>
                      <option value="lecture_seule">Lecture seule de l’historique</option>
                      <option value="floute">Floutés (verrouillés)</option>
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">Délai de grâce Maison (jours)
                    <input type="number" min={0} max={365} value={grace} onChange={(e) => setGrace(Number(e.target.value))} className={input} />
                  </label>
                  <input
                    aria-label="Raison (règles globales)"
                    value={paramReason}
                    onChange={(e) => setParamReason(e.target.value)}
                    placeholder="Raison (obligatoire)"
                    className={`${input} sm:col-span-2`}
                  />
                </div>
                <button
                  disabled={busy || paramReason.trim().length < 3}
                  onClick={async () => {
                    const ok1 = await call('admin_set_access_parameter', { p_key: 'fin_pack_mode', p_value: finMode, p_raison: paramReason });
                    const ok2 = ok1 && (await call('admin_set_access_parameter', { p_key: 'delai_grace_jours', p_value: grace, p_raison: paramReason }));
                    if (ok2) setParamReason('');
                  }}
                  className={`${btn} mt-2 bg-navy-600 text-white hover:bg-navy-700`}
                >
                  Enregistrer les règles
                </button>
              </details>
            )}

            {/* ── Journal ─────────────────────────────────────────────── */}
            <details className="mt-4 rounded-xl border border-gray-100 px-3 py-2">
              <summary className="text-sm font-bold cursor-pointer">Journal des modifications ({detail.journal.length})</summary>
              <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {detail.journal.map((j) => (
                  <li key={j.id} className="text-xs text-gray-700">
                    {new Date(j.cree_le).toLocaleString('fr-CA')} · {j.acteur_role ?? 'système'} · {j.objet} {j.action.toLowerCase()} — {j.raison ?? '—'}
                  </li>
                ))}
                {detail.journal.length === 0 && <li className="text-xs text-gray-500">Aucune modification.</li>}
              </ul>
            </details>
          </>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} disabled={busy} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
