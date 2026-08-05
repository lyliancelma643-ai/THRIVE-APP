// Liste d'attente THRIVE — vocabulaire de l'espace super admin.
//
// Le formulaire public vit sur le SITE VITRINE (projet Thrive_Site_Web) et écrit
// dans `public.waitlist` en `anon`. Ici on ne fait que lire et qualifier :
// appeler, fixer un rendez-vous, prendre des notes.
//
// Les valeurs ci-dessous sont les valeurs EXACTES stockées en base (elles sont
// verrouillées par des contraintes CHECK, migration 058) — ne pas les traduire.

import { PACK_LABELS, type Pack } from './packs';

// ── Statuts ──────────────────────────────────────────────────────────────────

export const WAITLIST_STATUSES = [
  'nouveau',
  'appelé',
  'sans réponse',
  'converti',
  'perdu',
] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const STATUS_META: Record<WaitlistStatus, { label: string; cls: string }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-navy-100 text-navy-700' },
  appelé: { label: 'Appelé', cls: 'bg-indigo-100 text-indigo-700' },
  'sans réponse': { label: 'Sans réponse', cls: 'bg-amber-100 text-amber-700' },
  converti: { label: 'Converti', cls: 'bg-emerald-100 text-emerald-700' },
  perdu: { label: 'Perdu', cls: 'bg-gray-100 text-gray-500' },
};

// ── Sources d'acquisition ────────────────────────────────────────────────────

export const WAITLIST_SOURCES = ['qr', 'insta', 'site', 'direct'] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

export const SOURCE_LABELS: Record<WaitlistSource, string> = {
  qr: 'QR code',
  insta: 'Instagram',
  site: 'Site web',
  direct: 'Direct',
};

export function sourceLabel(value: string | null): string {
  if (!value) return '—';
  return SOURCE_LABELS[value as WaitlistSource] ?? value;
}

// ── Préférence de rappel ─────────────────────────────────────────────────────
//
// Déclaratif : c'est le prospect qui l'indique sur le site. Le vrai rendez-vous
// (`appointment_at`) est posé ensuite par le super admin, pendant ou après
// l'appel — les deux ne se confondent jamais.

export const CALL_PREFERENCES = [
  'matin',
  'midi',
  'apres-midi',
  'soir',
  'fin-de-semaine',
  'peu-importe',
] as const;

export type CallPreference = (typeof CALL_PREFERENCES)[number];

export const CALL_PREFERENCE_LABELS: Record<CallPreference, string> = {
  matin: 'En matinée',
  midi: 'Sur l’heure du dîner',
  'apres-midi': 'En après-midi',
  soir: 'En soirée',
  'fin-de-semaine': 'La fin de semaine',
  'peu-importe': 'Peu importe',
};

export function callPreferenceLabel(value: string | null): string {
  if (!value) return '—';
  return CALL_PREFERENCE_LABELS[value as CallPreference] ?? value;
}

// ── Tranches d'âge (alignées sur AgeGroup de @thrive/shared) ────────────────

export const AGE_GROUPS = ['8-11', '12-14', '15-17'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

// ── Ligne de liste d'attente ────────────────────────────────────────────────

export type WaitlistRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  first_name: string;
  email: string;
  phone: string;
  source: string | null;
  consent: boolean;
  status: WaitlistStatus;
  pack: string | null;
  destination: string | null;
  notes: string | null;
  called_at: string | null;
  // Fiche prospect (migration 058)
  child_first_name: string | null;
  child_age: number | null;
  age_group: string | null;
  main_need: string | null;
  call_preference: string | null;
  appointment_at: string | null;
};

// Select explicite plutôt que `*` : le jour où la table gagne une colonne
// interne, elle ne part pas dans l'export CSV sans qu'on l'ait décidé.
export const WAITLIST_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'first_name',
  'email',
  'phone',
  'source',
  'consent',
  'status',
  'pack',
  'destination',
  'notes',
  'called_at',
  'child_first_name',
  'child_age',
  'age_group',
  'main_need',
  'call_preference',
  'appointment_at',
].join(', ');

export function formatPack(value: string | null): string {
  if (!value) return '';
  return (PACK_LABELS as Record<string, string>)[value] ?? value;
}

// ── Agenda ──────────────────────────────────────────────────────────────────

/** Un rendez-vous fixé, pas encore passé. */
export function isUpcoming(iso: string | null, now = Date.now()): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > now;
}

/** Rendez-vous dépassé mais prospect toujours pas traité → à relancer. */
export function isOverdue(row: WaitlistRow, now = Date.now()): boolean {
  if (!row.appointment_at) return false;
  if (row.status === 'converti' || row.status === 'perdu') return false;
  return new Date(row.appointment_at).getTime() < now;
}

/** ISO → valeur d'un <input type="datetime-local"> (heure LOCALE, sans zone). */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valeur d'un <input type="datetime-local"> → ISO UTC (ou null si vidé). */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-CA');
}

// ── Export CSV ──────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Date d’inscription',
  'Prénom',
  'Courriel',
  'Téléphone',
  'Enfant',
  'Âge',
  'Tranche d’âge',
  'Besoin principal',
  'Pack',
  'Préférence d’appel',
  'Statut',
  'Rendez-vous',
  'Appelé le',
  'Ville / région',
  'Source',
  'Notes',
];

function csvCell(value: string | number | null | undefined): string {
  // Tout est cité : les notes contiennent des retours à la ligne et des
  // points-virgules. Le guillemet interne se double (RFC 4180).
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function waitlistToCsv(rows: WaitlistRow[]): string {
  const lines = [
    CSV_HEADERS.map(csvCell).join(';'),
    ...rows.map((r) =>
      [
        formatDateTime(r.created_at),
        r.first_name,
        r.email,
        r.phone,
        r.child_first_name,
        r.child_age,
        r.age_group,
        r.main_need,
        formatPack(r.pack),
        r.call_preference ? callPreferenceLabel(r.call_preference) : '',
        STATUS_META[r.status]?.label ?? r.status,
        r.appointment_at ? formatDateTime(r.appointment_at) : '',
        r.called_at ? formatDateTime(r.called_at) : '',
        r.destination,
        r.source ? sourceLabel(r.source) : '',
        r.notes,
      ]
        .map(csvCell)
        .join(';')
    ),
  ];
  // Séparateur point-virgule : celui qu'attend Excel en locale fr-CA. Avec une
  // virgule, Excel colle la ligne entière dans la colonne A.
  // BOM UTF-8 en tête : sans lui, Excel lit le fichier en ANSI et casse les accents.
  return '﻿' + lines.join('\r\n');
}

// ── Recherche ───────────────────────────────────────────────────────────────

export function matchesSearch(row: WaitlistRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.first_name,
    row.email,
    row.phone,
    row.child_first_name,
    row.destination,
    row.main_need,
    row.notes,
    formatPack(row.pack),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export type { Pack };
