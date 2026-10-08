// Dates des séances 1:1 côté parent : libellés lisibles (« mardi 6 octobre ·
// 17 h 30 ») et fichier calendrier (.ics) pour « Ajouter au calendrier ».

const TZ = 'America/Toronto';

/** Heure locale (Québec) d'un instant, ou null si l'heure n'a pas été fixée (minuit pile). */
export function sessionTime(iso: string, timeZone = TZ): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  // Une séance planifiée « à la date » seulement arrive à 00 h 00 : pas d'heure à montrer.
  if (h === 0 && m === '00') return null;
  // Espaces insécables : « 14 h 30 » ne se coupe jamais en fin de ligne.
  return m === '00' ? `${h}\u00a0h` : `${h}\u00a0h\u00a0${m}`;
}

/** « mardi 6 octobre » (+ « · 17 h 30 » si l'heure est connue). */
export function sessionWhen(iso: string, timeZone = TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone });
  const time = sessionTime(iso, timeZone);
  return time ? `${day} · ${time}` : day;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Contenu d'un fichier .ics pour une séance (1 h par défaut). */
export function sessionIcs(opts: {
  id: string;
  title: string;
  start: string;
  durationMinutes?: number | null;
  description?: string;
  now?: Date;
}): string {
  const start = new Date(opts.start);
  const end = new Date(start.getTime() + (opts.durationMinutes || 60) * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//THRIVE Sport Positive//Seances//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${opts.id}@thrive`,
    `DTSTAMP:${icsDate(opts.now ?? new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(opts.title)}`,
    ...(opts.description ? [`DESCRIPTION:${icsText(opts.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
