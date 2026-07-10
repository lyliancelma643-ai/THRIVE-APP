'use client';

import { useState } from 'react';
import { supabaseClient as supabase } from '@thrive/shared';
import { useChildStore } from '@/stores/child.store';
import { usePlan } from '@/lib/entitlements';
import {
  PACK_LABELS,
  PACK_ORDER,
  PACK_PRICES,
  PACK_TAGLINES,
  can,
  limit,
  type Pack,
} from '@/lib/packs';

// ─────────────────────────────────────────────────────────────────────────────
// Page forfaits — tableau comparatif des 3 packs (matrice packs.ts, copie
// conforme de la table `plans`). Chaque palier reprend tout le précédent.
// Achat : Stripe Checkout via l'edge function create-checkout-session ; le
// webhook écrit l'entitlement qui synchronise families.pack (seul chemin
// autorisé). Repli gracieux tant que Stripe n'est pas configuré.
// ─────────────────────────────────────────────────────────────────────────────

type RowValue = boolean | string;
type Row = { label: string; value: (pack: Pack) => RowValue; soon?: boolean };

const ROWS: Row[] = [
  { label: 'Coach humain 1:1 — 13 séances', value: () => true },
  { label: 'Bibliothèque vidéo interactive complète', value: () => true },
  { label: "Carte d'identité de l'athlète", value: () => true },
  { label: 'Message du coach à chaque séance', value: () => true },
  { label: 'Jauge compétences de vie — globale', value: () => true },
  { label: 'Certificat de fin de parcours', value: () => true },
  { label: 'Jauge par compétence + évolution', value: (p) => can(p, 'skillBreakdown') },
  { label: 'Courbe LSSS longitudinale', value: (p) => can(p, 'lsssCurve') },
  { label: 'Roue des émotions', value: (p) => can(p, 'emotionWheel') },
  { label: 'Journal de progression', value: (p) => can(p, 'progressJournal') },
  {
    label: 'Bilan détaillé + observations chiffrées',
    value: (p) =>
      p === 'PERFORMANCE' ? 'Toutes les séances' : p === 'AVANCE' ? 'Séances 3 · 7 · 13' : false,
  },
  { label: 'Lettre personnalisée du coach', value: (p) => can(p, 'coachLetter') },
  { label: 'Gabarits de rapport premium', value: (p) => can(p, 'premiumTemplates') },
  { label: 'Messagerie directe avec le coach', value: (p) => can(p, 'coachMessaging') },
  { label: 'Export CSV / PDF du parcours', value: (p) => can(p, 'csvExport') },
  // ⚠️ Emplacement réservé — aucune intégration IA (flag aiSummary OFF partout)
  { label: 'Synthèse IA de fin de parcours', value: () => 'À venir', soon: true },
  { label: 'Profils enfants', value: (p) => fmtCount(limit(p, 'maxChildren')) },
  { label: 'Comptes parents / superviseurs', value: (p) => fmtCount(limit(p, 'maxParents')) },
  {
    label: 'Historique conservé',
    value: (p) => (limit(p, 'historyMonths') === null ? 'Illimité' : `${limit(p, 'historyMonths')} mois`),
  },
  { label: 'Stockage documents', value: (p) => `${limit(p, 'storageMb')} Mo` },
];

function fmtCount(n: number | null): string {
  return n === null ? 'Illimité' : String(n);
}

function RowValueCell({ v, soon }: { v: RowValue; soon?: boolean }) {
  if (v === true) {
    return (
      <span className="text-sage" aria-label="Inclus">
        ✓
      </span>
    );
  }
  if (v === false) {
    return (
      <span className="text-white/25" aria-label="Non inclus">
        —
      </span>
    );
  }
  return <span className={soon ? 'text-white/45 italic' : 'text-white/80'}>{v}</span>;
}

export default function UpgradePage() {
  const { selectedChildId } = useChildStore();
  const { pack: currentPack, isLoading } = usePlan(selectedChildId);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPack, setPendingPack] = useState<Pack | null>(null);

  const currentIdx = PACK_ORDER.indexOf(currentPack);

  const checkout = async (target: Pack) => {
    setNotice(null);
    setPendingPack(target);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expirée, veuillez vous reconnecter.');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan_code: target, origin: window.location.origin }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.message ?? 'checkout_indisponible');
    } catch {
      setNotice(
        'Le paiement en ligne arrive très bientôt. En attendant, contactez votre coach THRIVE pour changer de forfait — le changement est immédiat.'
      );
    } finally {
      setPendingPack(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Les forfaits THRIVE</h1>
      <p className="text-white/55 mb-8 max-w-2xl">
        Chaque forfait reprend tout le précédent et va plus loin — plus de profondeur, plus de
        suivi, plus d&apos;accès à votre coach. Paiement unique pour le parcours de 13 séances.
      </p>

      {notice && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-sun/30 bg-sun/[0.08] px-4 py-3">
          <span className="text-sun mt-0.5 select-none" aria-hidden>
            ✦
          </span>
          <p className="text-sm leading-relaxed text-white/85">{notice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PACK_ORDER.map((p) => {
          const idx = PACK_ORDER.indexOf(p);
          const isCurrent = !isLoading && p === currentPack;
          const isUpgrade = !isLoading && idx > currentIdx;
          return (
            <section
              key={p}
              className={`glass-navy rounded-2xl p-6 flex flex-col ${
                isCurrent ? 'ring-2 ring-sage/60' : 'ring-1 ring-white/10'
              }`}
            >
              <div className="mb-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold text-white">
                    {PACK_LABELS[p]}
                  </h2>
                  {isCurrent && (
                    <span className="px-3 py-1 rounded-full bg-sage text-navy-900 text-xs font-bold">
                      Votre forfait
                    </span>
                  )}
                </div>
                <p className="text-sun font-display text-3xl font-semibold mt-2">
                  {PACK_PRICES[p]}
                  <span className="text-sm text-white/45 font-sans font-normal"> · parcours complet</span>
                </p>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">{PACK_TAGLINES[p]}</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {ROWS.map((row) => {
                  const v = row.value(p);
                  return (
                    <li
                      key={row.label}
                      className="flex items-start justify-between gap-3 text-[13px] leading-snug"
                    >
                      <span className={v === false ? 'text-white/35' : 'text-white/75'}>
                        {row.label}
                      </span>
                      <span className="shrink-0 font-medium">
                        <RowValueCell v={v} soon={row.soon} />
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 pt-5 border-t border-white/10">
                {isCurrent ? (
                  <span className="block w-full text-center px-6 py-3 rounded-full bg-white/[0.06] border border-white/10 text-sm font-bold text-white/45 select-none">
                    Forfait actuel
                  </span>
                ) : isUpgrade ? (
                  <button
                    onClick={() => checkout(p)}
                    disabled={pendingPack !== null}
                    className="block w-full text-center px-6 py-3 rounded-full bg-sun text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 disabled:opacity-50 disabled:cursor-wait transition-all"
                  >
                    {pendingPack === p ? 'Redirection…' : `Passer au pack ${PACK_LABELS[p]}`}
                  </button>
                ) : (
                  <span className="block w-full text-center px-6 py-3 rounded-full border border-white/10 text-sm font-medium text-white/35 select-none">
                    Inclus dans votre forfait
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-white/35 mt-8 max-w-2xl leading-relaxed">
        Le changement de forfait s&apos;applique immédiatement après le paiement, pour toute la
        famille. Les bilans déjà reçus sont régénérés à la profondeur de votre nouveau forfait par
        votre coach. Prix en dollars canadiens, taxes en sus le cas échéant.
      </p>
    </div>
  );
}
