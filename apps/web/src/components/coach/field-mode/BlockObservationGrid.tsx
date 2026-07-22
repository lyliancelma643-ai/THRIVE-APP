'use client';

// BLOC 4 — Grille d'observation (bloc dominant).
//
// Reprend à l'identique le système existant : échelle 1 à 5, mêmes libellés,
// mêmes clés d'enregistrement que le mode standard. Seuls les indicateurs
// rattachés à ce temps de séance sont affichés — ce rattachement vient de la
// structure du contenu, il n'est pas codé ici.
import type { FieldModeIndicator } from '@/lib/field-mode/types';
import { tap } from './haptics';

const NOTES = [1, 2, 3, 4, 5];

export function BlockObservationGrid({
  indicators,
  ratings,
  onRate,
}: {
  indicators: FieldModeIndicator[];
  ratings: Record<string, number>;
  onRate: (key: string, value: number) => void;
}) {
  if (indicators.length === 0) return null;

  return (
    <section
      // `p-3` sur mobile : à 375 px, `p-4` ramènerait les boutons 1–5 à 55 px,
      // sous la cible tactile visée pour un usage ganté.
      className="rounded-2xl p-3 sm:p-4 space-y-5"
      style={{ background: 'var(--fm-surface)', border: '1px solid var(--fm-border)' }}
    >
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: 'var(--fm-dim)' }}>
        Grille d’observation — 1 fragile · 5 solide
      </h2>

      {indicators.map((ind) => {
        const value = ratings[ind.key] ?? 0;
        return (
          <div key={ind.key} role="radiogroup" aria-label={ind.label}>
            <p className="text-[17px] font-semibold mb-2 leading-snug" style={{ color: 'var(--fm-text)' }}>
              {ind.label}
            </p>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {NOTES.map((n) => {
                const filled = value >= n;
                const exact = value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={exact}
                    aria-label={`Note ${n} sur 5`}
                    onClick={() => {
                      tap();
                      onRate(ind.key, n);
                    }}
                    className="min-h-[56px] text-[19px] font-bold transition-all duration-150"
                    style={{
                      // La sélection change de FORME (cercle → carré arrondi)
                      // autant que de couleur — jamais la couleur seule.
                      borderRadius: exact ? '0.9rem' : '9999px',
                      background: filled ? 'var(--fm-accent)' : 'var(--fm-surface-2)',
                      color: filled ? 'var(--fm-on-accent)' : 'var(--fm-dim)',
                      border: exact
                        ? '3px solid var(--fm-text)'
                        : '3px solid transparent',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
