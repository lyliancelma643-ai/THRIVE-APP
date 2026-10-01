'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
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
// Pas d'achat en ligne pour ces parcours coachés : le changement de forfait se
// fait avec le coach (paiement hors app). Le seul paiement en ligne de l'app est
// l'abonnement P3 « Le moment qui compte » (/parent/abonnement).
// ─────────────────────────────────────────────────────────────────────────────

type RowValue = boolean | string;
type Row = { label: string; value: (pack: Pack) => RowValue; soon?: boolean };

// Inclus dans les trois forfaits : affiché une fois, au-dessus des cartes.
const COMMON = [
  'Un coach THRIVE en 1:1 pour les 13 séances',
  'Les séances vidéo de 20 minutes à faire en famille',
  'La carte d’identité d’athlète de ton enfant',
  'Le message du coach après chaque séance',
  'La jauge globale des compétences de vie',
  'Le certificat de fin de parcours',
];

// Ce qui change d'un forfait à l'autre, en mots de parent.
const ROWS: Row[] = [
  { label: 'Détail par compétence et son évolution', value: (p) => can(p, 'skillBreakdown') },
  { label: 'Courbe de progression des compétences de vie', value: (p) => can(p, 'lsssCurve') },
  { label: 'Roue des émotions', value: (p) => can(p, 'emotionWheel') },
  { label: 'Journal de progression', value: (p) => can(p, 'progressJournal') },
  {
    label: 'Bilan détaillé du coach, avec ses observations',
    value: (p) =>
      p === 'PERFORMANCE' ? 'Chaque séance' : p === 'AVANCE' ? 'Séances 3, 7 et 13' : false,
  },
  { label: 'Lettre personnalisée du coach', value: (p) => can(p, 'coachLetter') },
  { label: 'Rapports de séance enrichis', value: (p) => can(p, 'premiumTemplates') },
  { label: 'Écrire directement au coach', value: (p) => can(p, 'coachMessaging') },
  { label: 'Export du parcours', value: (p) => can(p, 'csvExport') },
  { label: 'Enfants accompagnés', value: (p) => fmtCount(limit(p, 'maxChildren')) },
  { label: 'Parents ou tuteurs', value: (p) => fmtCount(limit(p, 'maxParents')) },
  {
    label: 'Historique conservé',
    value: (p) => (limit(p, 'historyMonths') === null ? 'Illimité' : `${limit(p, 'historyMonths')} mois`),
  },
];

function fmtCount(n: number | null): string {
  return n === null ? 'Illimité' : String(n);
}

function RowValueCell({ v, soon }: { v: RowValue; soon?: boolean }) {
  if (v === true) {
    return (
      <span className="inline-flex text-sage-ink" role="img" aria-label="Inclus">
        <Icon name="check" className="w-4 h-4" strokeWidth={2.4} />
      </span>
    );
  }
  if (v === false) {
    return (
      <span className="text-faint" aria-label="Non inclus">
        —
      </span>
    );
  }
  return <span className={soon ? 'text-faint italic' : 'text-body'}>{v}</span>;
}

export default function UpgradePage() {
  const { selectedChildId } = useChildStore();
  const { pack: currentPack, isLoading } = usePlan(selectedChildId);
  const currentIdx = PACK_ORDER.indexOf(currentPack);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl font-semibold text-ink mb-2">Les forfaits THRIVE</h1>
      <p className="text-soft mb-6 max-w-2xl">
        Le forfait choisi avec ton coach pour le parcours de 13 séances. Chaque forfait reprend
        tout le précédent et va plus loin. Paiement unique, réglé avec ton coach.
      </p>

      <section className="nc-card mb-6 max-w-3xl">
        <h2 className="nc-eyebrow mb-3">Dans tous les forfaits</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {COMMON.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[14px] leading-snug text-body">
              <Icon name="check" className="w-4 h-4 mt-0.5 shrink-0 text-sage-ink" strokeWidth={2.4} />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PACK_ORDER.map((p) => {
          const idx = PACK_ORDER.indexOf(p);
          const isCurrent = !isLoading && p === currentPack;
          const isUpgrade = !isLoading && idx > currentIdx;
          return (
            <section
              key={p}
              className={`bg-night-surface shadow-[var(--shadow)] rounded-card p-6 flex flex-col ${
                isCurrent ? 'ring-2 ring-sage/60' : 'ring-1 ring-line'
              }`}
            >
              <div className="mb-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {PACK_LABELS[p]}
                  </h2>
                  {isCurrent && (
                    <span className="px-3 py-1 rounded-full bg-sage text-navy-900 text-xs font-bold">
                      Ton forfait
                    </span>
                  )}
                </div>
                <p className="text-accent-ink font-display text-3xl font-semibold mt-2">
                  {PACK_PRICES[p]}
                  <span className="text-sm text-faint font-sans font-normal"> · parcours complet</span>
                </p>
                <p className="text-sm text-soft mt-2 leading-relaxed">{PACK_TAGLINES[p]}</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {ROWS.map((row) => {
                  const v = row.value(p);
                  return (
                    <li
                      key={row.label}
                      className="flex items-start justify-between gap-3 text-[13px] leading-snug"
                    >
                      <span className={v === false ? 'text-faint' : 'text-body'}>
                        {row.label}
                      </span>
                      <span className="shrink-0 font-medium">
                        <RowValueCell v={v} soon={row.soon} />
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 pt-5 border-t border-line">
                {isCurrent ? (
                  <span className="block w-full text-center px-6 py-3 rounded-full bg-chip border border-line text-sm font-bold text-soft select-none">
                    Forfait actuel
                  </span>
                ) : isUpgrade ? (
                  <Link
                    href="/parent/messages"
                    className="block w-full text-center px-6 py-3 rounded-full bg-accent text-navy-900 text-sm font-bold hover:bg-sun-dark active:scale-95 transition-all"
                  >
                    {`Passer à ${PACK_LABELS[p]} — écrire à mon coach`}
                  </Link>
                ) : (
                  <span className="block w-full text-center px-6 py-3 text-sm font-medium text-faint select-none">
                    Compris dans ton forfait actuel
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="nc-row mt-8 p-5 max-w-3xl flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink">Et l&apos;abonnement Maison ?</p>
          <p className="text-[14px] text-soft mt-1 leading-relaxed">
            Les activités « Maison » à vivre en famille entre les séances sont incluses pendant ton
            accompagnement, quel que soit ton forfait. Sans accompagnement, elles existent aussi en
            abonnement seul.
          </p>
        </div>
        <Link
          href="/parent/fitness"
          className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-5 rounded-full border border-line2 bg-chip text-ink text-[14px] font-semibold"
        >
          Voir Maison
        </Link>
      </section>

      <p className="text-xs text-faint mt-6 max-w-2xl leading-relaxed">
        Le changement de forfait s&apos;applique immédiatement après le paiement, pour toute la
        famille. Les bilans déjà reçus sont régénérés à la profondeur de ton nouveau forfait par
        ton coach. Prix en dollars canadiens, taxes en sus le cas échéant.
      </p>
    </div>
  );
}
