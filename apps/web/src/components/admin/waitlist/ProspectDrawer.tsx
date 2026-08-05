'use client';

import { useEffect, useState } from 'react';
import { PACK_LABELS, PACK_ORDER } from '@/lib/packs';
import { Icon } from '@/components/ui';
import { useModalDismiss } from '@/lib/useModalDismiss';
import {
  STATUS_META,
  WAITLIST_STATUSES,
  callPreferenceLabel,
  formatDate,
  formatDateTime,
  fromDatetimeLocal,
  sourceLabel,
  toDatetimeLocal,
  type WaitlistRow,
  type WaitlistStatus,
} from '@/lib/waitlist';

// Fiche prospect : tout ce qu'on sait de lui, à portée de main pendant l'appel.
// Le panneau est la seule surface d'écriture — la liste, elle, reste en lecture
// pour qu'on ne modifie jamais la mauvaise ligne en scrollant.

export function ProspectDrawer({
  row,
  onClose,
  onPatch,
  onDelete,
}: {
  row: WaitlistRow;
  onClose: () => void;
  onPatch: (id: string, changes: Partial<WaitlistRow>) => void;
  onDelete: (row: WaitlistRow) => void;
}) {
  useModalDismiss(onClose);

  // Champs libres : l'affichage suit la frappe, l'écriture part au blur.
  const [notes, setNotes] = useState(row.notes ?? '');
  const [destination, setDestination] = useState(row.destination ?? '');
  const [appointment, setAppointment] = useState(toDatetimeLocal(row.appointment_at));

  // Changer de prospect sans fermer le panneau doit repartir de ses valeurs.
  useEffect(() => {
    setNotes(row.notes ?? '');
    setDestination(row.destination ?? '');
    setAppointment(toDatetimeLocal(row.appointment_at));
  }, [row.id, row.notes, row.destination, row.appointment_at]);

  const changeStatus = (status: WaitlistStatus) => {
    if (status === row.status) return;
    const changes: Partial<WaitlistRow> = { status };
    // Passer à « Appelé » horodate l'appel, une seule fois : si on repasse par
    // ce statut plus tard, la date du PREMIER appel est conservée.
    if (status === 'appelé' && !row.called_at) changes.called_at = new Date().toISOString();
    onPatch(row.id, changes);
  };

  const commitAppointment = () => {
    const iso = fromDatetimeLocal(appointment);
    if (iso === row.appointment_at) return;
    onPatch(row.id, { appointment_at: iso });
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        aria-label="Fermer la fiche"
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche de ${row.first_name}`}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-cream shadow-2xl safe-top"
      >
        {/* En-tête collant : l'identité reste visible pendant qu'on fait défiler */}
        <header className="sticky top-0 z-10 border-b border-navy-600/10 bg-cream/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-navy-900">{row.first_name}</p>
              <p className="text-xs text-gray-500">
                Inscrit le {formatDate(row.created_at)} · {sourceLabel(row.source)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy-600/60 hover:bg-navy-50"
            >
              <span aria-hidden className="text-xl leading-none">×</span>
              <span className="sr-only">Fermer</span>
            </button>
          </div>

          {/* Appeler en un geste — c'est l'action principale de cet écran. */}
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${row.phone.replace(/\s/g, '')}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-navy-600 px-4 text-sm font-bold text-white hover:bg-navy-700"
            >
              <Icon name="user" className="h-4 w-4" />
              {row.phone}
            </a>
            <a
              href={`mailto:${row.email}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-navy-50 px-4 text-sm font-semibold text-navy-700 hover:bg-navy-100"
            >
              <Icon name="mail" className="h-4 w-4" />
              <span className="sr-only">Écrire à {row.email}</span>
            </a>
          </div>
          <p className="mt-2 truncate text-xs text-gray-500">{row.email}</p>
        </header>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* ── Suivi ───────────────────────────────────────────────────── */}
          <Section title="Suivi">
            <Row label="Statut">
              <select
                value={row.status}
                onChange={(e) => changeStatus(e.target.value as WaitlistStatus)}
                className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold ${
                  STATUS_META[row.status]?.cls ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {WAITLIST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Souhaite être appelé">
              <span className="text-sm font-medium text-navy-900">
                {callPreferenceLabel(row.call_preference)}
              </span>
            </Row>

            <div>
              <label
                htmlFor="wl-appointment"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Rendez-vous d’appel
              </label>
              <div className="flex gap-2">
                <input
                  id="wl-appointment"
                  type="datetime-local"
                  value={appointment}
                  onChange={(e) => setAppointment(e.target.value)}
                  onBlur={commitAppointment}
                  className="min-h-[44px] flex-1 rounded-xl border border-navy-600/15 bg-white px-3 text-base"
                />
                {row.appointment_at && (
                  <button
                    onClick={() => {
                      setAppointment('');
                      onPatch(row.id, { appointment_at: null });
                    }}
                    className="min-h-[44px] rounded-xl bg-navy-50 px-3 text-xs font-semibold text-navy-700 hover:bg-navy-100"
                  >
                    Annuler
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                {row.appointment_at
                  ? `Fixé au ${formatDateTime(row.appointment_at)}`
                  : 'Aucun rendez-vous fixé.'}
              </p>
            </div>

            <Row label="Premier appel">
              <span className="text-sm text-gray-600">{formatDateTime(row.called_at)}</span>
            </Row>
          </Section>

          {/* ── Le jeune ────────────────────────────────────────────────── */}
          <Section title="Le jeune">
            <Row label="Prénom">
              <Value>{row.child_first_name}</Value>
            </Row>
            <Row label="Âge">
              <Value>{row.child_age ? `${row.child_age} ans` : null}</Value>
            </Row>
            <Row label="Tranche d’âge">
              <Value>{row.age_group ? `${row.age_group} ans` : null}</Value>
            </Row>
            <Row label="Besoin principal">
              <Value>{row.main_need}</Value>
            </Row>
          </Section>

          {/* ── Commercial ──────────────────────────────────────────────── */}
          <Section title="Commercial">
            <Row label="Pack visé">
              <select
                value={row.pack ?? ''}
                onChange={(e) => onPatch(row.id, { pack: e.target.value || null })}
                className="rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"
              >
                <option value="">—</option>
                {PACK_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PACK_LABELS[p]}
                  </option>
                ))}
              </select>
            </Row>
            <div>
              <label
                htmlFor="wl-destination"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Ville / région
              </label>
              <input
                id="wl-destination"
                type="text"
                value={destination}
                placeholder="Ex. Rive-Sud de Montréal"
                onChange={(e) => setDestination(e.target.value)}
                onBlur={() => {
                  const next = destination.trim() || null;
                  if (next !== row.destination) onPatch(row.id, { destination: next });
                }}
                className="min-h-[44px] w-full rounded-xl border border-navy-600/15 bg-white px-3 text-base"
              />
            </div>
          </Section>

          {/* ── Notes ───────────────────────────────────────────────────── */}
          <Section title="Notes d’appel">
            <textarea
              value={notes}
              rows={6}
              placeholder="Ce qu’il a dit, les objections, la suite à donner…"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                const next = notes.trim() || null;
                if (next !== row.notes) onPatch(row.id, { notes: next });
              }}
              className="w-full rounded-xl border border-navy-600/15 bg-white px-3 py-2.5 text-base leading-relaxed"
            />
            <p className="text-xs text-gray-400">
              Enregistré automatiquement en quittant le champ.
              {row.updated_at && ` Dernière modification : ${formatDateTime(row.updated_at)}.`}
            </p>
          </Section>

          <button
            onClick={() => onDelete(row)}
            className="mt-2 min-h-[44px] rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Supprimer ce prospect
          </button>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-600/50">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500">{label}</span>
      {children}
    </div>
  );
}

// Un champ vide se dit — sinon on ne sait pas si l'information manque ou si
// l'affichage a échoué.
function Value({ children }: { children: React.ReactNode }) {
  if (children === null || children === undefined || children === '') {
    return <span className="text-sm italic text-gray-300">non renseigné</span>;
  }
  return <span className="text-sm font-medium text-navy-900">{children}</span>;
}
